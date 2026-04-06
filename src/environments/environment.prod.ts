export const environment = {
  production: true,
  huggingFace: {
    enabled: true,
    apiToken: '',
    useServerProxy: true,
    proxyUrl: '/api/hf',
    model: 'meta-llama/Llama-3.1-8B-Instruct:novita',
    classificationModel: 'facebook/bart-large-mnli',
    imageEnabled: true,
    imageModel: 'stabilityai/stable-diffusion-xl-base-1.0'
  }
};