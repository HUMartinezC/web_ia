const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_INFERENCE_BASE_URL = 'https://router.huggingface.co/hf-inference/models';

type ProxyTarget = 'chat' | 'classification' | 'image';

declare const process: { env: Record<string, string | undefined> };

interface ServerlessRequest {
	method?: string;
	query: Record<string, string | string[] | undefined>;
	headers: Record<string, string | string[] | undefined>;
	body?: unknown;
}

interface ServerlessResponse {
	status: (code: number) => ServerlessResponse;
	json: (payload: unknown) => void;
	end: () => void;
	setHeader: (name: string, value: string) => void;
	send: (payload: Uint8Array) => void;
}

function toSingleQueryValue(value: string | string[] | undefined): string {
	if (Array.isArray(value)) {
		return value[0] ?? '';
	}

	return value ?? '';
}

function resolveUpstreamUrl(req: ServerlessRequest): string | null {
	const target = toSingleQueryValue(req.query['target']) as ProxyTarget;

	if (target === 'chat') {
		return HF_CHAT_URL;
	}

	if (target === 'classification' || target === 'image') {
		const model = toSingleQueryValue(req.query['model']).trim();
		if (!model) {
			return null;
		}

		return `${HF_INFERENCE_BASE_URL}/${encodeURIComponent(model)}`;
	}

	return null;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
	if (req.method === 'OPTIONS') {
		res.status(204).end();
		return;
	}

	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed. Use POST.' });
		return;
	}

	const token = process.env['HF_API_TOKEN'];
	if (!token) {
		res.status(500).json({ error: 'Missing HF_API_TOKEN in Vercel environment variables.' });
		return;
	}

	const upstreamUrl = resolveUpstreamUrl(req);
	if (!upstreamUrl) {
		res.status(400).json({ error: 'Invalid target/model query.' });
		return;
	}

	try {
		const acceptHeader = req.headers['accept'] ?? 'application/json';
		const normalizedAccept = Array.isArray(acceptHeader) ? acceptHeader[0] : acceptHeader;

		const upstreamResponse = await fetch(upstreamUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				Accept: normalizedAccept
			},
			body: JSON.stringify(req.body ?? {})
		});

		const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';
		const payload = new Uint8Array(await upstreamResponse.arrayBuffer());

		res.status(upstreamResponse.status);
		res.setHeader('Content-Type', contentType);
		res.setHeader('Cache-Control', 'no-store');
		res.send(payload);
	} catch {
		res.status(502).json({ error: 'Failed to reach Hugging Face from Vercel function.' });
	}
}
