# SillyTavern Extras: Lite

Provides an Extras-compatible API interface for SillyTavern Extensions.

This was not tested on Termux and is unlikely to work there. I won't provide any help with that.

## Supported modules

* `whisper-stt` - Speech Recognition extensions. Running [nodejs-whisper](https://github.com/ChetanXpro/nodejs-whisper).
* `sd` - wrapper for OpenAI-compatible endpoint for image generation.
* `summarize` - wrapper for OpenAI-compatible endpoint for text summarization.
* `classify` - wrapper for OpenAI-compatible endpoint for text classification.
* `caption` - wrapper for OpenAI-compatible multimodal image captioning.
* `embeddings` - wrapper for OpenAI-compatible text embeddings computation.

```txt
>AI revolution
>Look inside
>OpenAI API calls
```

## Disabling modules

All of the modules are enabled by default.

If you don't want to use any specific module, add its name to the `disabledModules` list in `config.yaml`.

Example:

```yaml
disabledModules: ['sd', 'summarize'] # etc...
```

## Usage instructions

### Prerequisites

1. Node.js (20 or later). The latest LTS version is preferred.
2. Git.

### How to install

```bash
git clone https://github.com/Cohee1207/SillyTavern-ExtrasLite
cd SillyTavern-ExtrasLite
npm install
npm run start
```

Then plug the URL into SillyTavern Extras API URL.

## Configurations

See [config.default.yaml](https://github.com/Cohee1207/SillyTavern-ExtrasLite/blob/main/config.default.yaml) for possible configurations. Modify the copy at `config.yaml` to apply them.

* `listen`/`port`/`share` - networking configs.
* `openAI` - plug API key / URL here and choose models to use.
* `prompts` - configure prompts used for module tasks.

## License

AGPLv3
