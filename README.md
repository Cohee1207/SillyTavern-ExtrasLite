# SillyTavern Extras: Lite

Provides an Extras-compatible API interface for SillyTavern Extensions.

This was not tested on Termux and is unlikely to work there. I won't provide any help with that.

## Supported modules

* `whisper-stt` - Speech Recognition extensions. Running [nodejs-whisper](https://github.com/ChetanXpro/nodejs-whisper).
* `sd` - wrapper for OpenAI-compatible endpoint for image generation.

## Usage instructions

### Prerequisites

1. Node.js (20 or later). The latest LTS version is preferred.
2. Git.

### How to install

```bash
git clone https://github.com/Cohee1207/SillyTavern-ExtrasLite
npm install
npm run start
```

Then plug the URL into SillyTavern Extras API URL.

## Configurations

See `config.default.yaml` for possible configurations. Modify the copy at `config.yaml` to apply them.
