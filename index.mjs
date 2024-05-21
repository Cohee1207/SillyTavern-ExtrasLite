import { getConfig } from './config.mjs';
import { createServer } from 'http';
import { Chalk } from 'chalk';
import path from 'path';
import fs from 'fs';
import express from 'express';
import url from 'url';
import localtunnel from 'localtunnel';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import cors from 'cors';
import multer from 'multer';
import { nodewhisper } from 'nodejs-whisper';

// Ensure the process is in the correct directory
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
process.chdir(__dirname);

const app = express();
const chalk = new Chalk();

const config = getConfig();
const port = config.port || 5100;
const hostname = config.listen ? '0.0.0.0' : 'localhost';
const share = config.share;
const apiKey = config.apiKey;
const openAIApiKey = config.openAI?.apiKey;
const openAIBaseUrl = config.openAI?.apiEndpoint ?? 'https://api.openai.com/v1';
const disabledModules = config.disabledModules ?? [];

const isModuleEnabled = (module) => MODULES.includes(module) && !disabledModules.includes(module);

const UPLOADS = './uploads';
const MODULES = [
    'whisper-stt',
    'sd',
    'classify',
    'summarize',
    'caption',
    'embeddings',
];

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));

app.get('/', (_req, res) => {
    res.send('Extras Lite is working! Plug the URL into your SillyTavern app.');
});

if (apiKey) {
    console.log('Your API key is:', chalk.blue(apiKey));
    app.use((req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        const expectedKey = `Bearer ${apiKey}`;
        const actualKey = req.headers['authorization'];

        if (actualKey !== expectedKey) {
            res.status(401).send('Unauthorized');
        } else {
            next();
        }
    });
}

// Everything below would require authentication
app.get('/api/modules', (_req, res) => {
    return res.json({ modules: MODULES });
});

if (isModuleEnabled('sd')) {
    const openAIImageGenerationModel = config.openAI?.imageGenerationModel ?? 'dall-e-3';
    const openAIImageEnforceSize = config.openAI?.imageEnforceSize ?? false;
    app.post('/api/image', async (req, res) => {
        try {
            const openai = new OpenAI({
                apiKey: openAIApiKey,
                baseURL: openAIBaseUrl,
            });

            console.log('Generating image:', req.body);

            let size = `${req.body.width}x${req.body.height}`;

            const validSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
            if (openAIImageEnforceSize && !validSizes.includes(size)) {
                console.warn(`Invalid image size: ${size}. Defaulting to 1024x1024. To disable this, set openAI.imageEnforceSize to false in your config.`);
                size = '1024x1024';
            }

            const image = await openai.images.generate({
                prompt: req.body.prompt,
                model: openAIImageGenerationModel,
                size: size,
                response_format: 'b64_json',
            });

            if (!image.data?.[0]?.b64_json) {
                console.log('No image data found', image);
                return res.sendStatus(500);
            }

            console.log('Image generated:', image.data[0]);

            return res.json({ image: image.data[0].b64_json });
        } catch (error) {
            console.error('Image generation failed:', error);
            return res.sendStatus(500);
        }
    });

    app.get('/api/image/models', async (_req, res) => {
        return res.json({ models: [openAIImageGenerationModel] });
    });

    app.get('/api/image/model', (_req, res) => {
        return res.json({ model: openAIImageGenerationModel });
    });

    app.get('/api/image/samplers', (_req, res) => {
        return res.json({ samplers: ['N/A'] });
    });

    app.post('/api/image/model', (_req, res) => {
        return res.json({ previous_model: 'N/A', current_model: 'N/A' });
    });
}

if (isModuleEnabled('whisper-stt')) {
    const whisperModel = config.whisper?.model ?? 'base.en';
    const audioFileUpload = multer({ dest: UPLOADS, limits: { fieldSize: 100 * 1024 * 1024 } }).single('AudioFile');

    app.post('/api/speech-recognition/whisper/process-audio', audioFileUpload, async (req, res) => {
        try {
            if (!req.file) {
                console.error('Whisper: No file uploaded');
                return res.sendStatus(400);
            }

            const wavFilePath = path.join(__dirname, req.file.path);
            const result = await nodewhisper(wavFilePath, {
                modelName: whisperModel,
                autoDownloadModelName: whisperModel,
                verbose: true,
                removeWavFileAfterTranscription: true,
                withCuda: true,
                whisperOptions: {
                    outputInText: true,
                    outputInSrt: false,
                    outputInCsv: false,
                    outputInVtt: false,
                    wordTimestamps: false,
                    splitOnWord: true,
                },
            });

            console.log('Whisper result:', result);

            const textFilePath = `${wavFilePath}.wav.txt`;
            const transcript = fs.readFileSync(textFilePath, 'utf8').trim();
            fs.rmSync(textFilePath);
            fs.rmSync(wavFilePath);

            return res.json({ transcript: transcript });
        } catch (error) {
            console.error('Audio processing failed:', error);
            return res.sendStatus(500);
        }
    });
}

if (isModuleEnabled('summarize')) {
    const summarizationPrompt = config.prompts?.summarization ?? 'Summarize this text.';
    const summarizationModel = config.openAI?.summarizationModel ?? 'gpt-4-turbo';

    app.post('/api/summarize', async (req, res) => {
        try {
            const text = req.body.text;

            const openai = new OpenAI({
                apiKey: openAIApiKey,
                baseURL: openAIBaseUrl,
            });

            console.log('Summarizing text:', text);

            const result = await openai.chat.completions.create({
                messages: [
                    { role: 'system', content: summarizationPrompt },
                    { role: 'user', content: text },
                ],
                model: summarizationModel,
            });

            if (!result.choices?.[0]?.message?.content) {
                console.log('No summarization data found', result);
                return res.sendStatus(500);
            }

            console.log('Summarization result:', result.choices[0].message.content);

            return res.json({ summary: result.choices[0].message.content });
        } catch (error) {
            console.error('Summarization failed:', error);
            return res.sendStatus(500);
        }
    });
}

if (isModuleEnabled('caption')) {
    const captioningPrompt = config.prompts?.captioning ?? 'Describe this image.';
    const captioningModel = config.openAI?.captioningModel ?? 'gpt-4-vision';

    app.post('/api/caption', async (req, res) => {
        try {
            const image = req.body.image;

            if (!image) {
                console.error('No image provided');
                return res.sendStatus(400);
            }

            console.log('Captioning image...');

            const openai = new OpenAI({
                apiKey: openAIApiKey,
                baseURL: openAIBaseUrl,
            });

            const result = await openai.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: captioningPrompt },
                            { type: 'image_url', image_url: { 'url': `data:image/jpeg;base64,${image}` } },
                        ],
                    },
                ],
                model: captioningModel,
            });

            if (!result.choices?.[0]?.message?.content) {
                console.log('No caption data found', result);
                return res.sendStatus(500);
            }

            console.log('Caption result:', result.choices[0].message.content);

            return res.json({ caption: result.choices[0].message.content });
        } catch (error) {
            console.error('Captioning failed:', error);
            return res.sendStatus(500);
        }
    });
}

if (isModuleEnabled('classify')) {
    const classificationPrompt = config.prompts?.classification ?? 'Classify this text.';
    const classificationLabels = config.prompts?.labels ?? ['joy', 'anger', 'surprise', 'sadness', 'fear', 'love'];
    const classificationModel = config.openAI?.classificationModel ?? 'gpt-4-turbo';

    app.get('/api/classify/labels', (_req, res) => {
        return res.json({ labels: classificationLabels });
    });

    app.post('/api/classify', async (req, res) => {
        try {
            const text = req.body.text;

            const openai = new OpenAI({
                apiKey: openAIApiKey,
                baseURL: openAIBaseUrl,
            });

            console.log('Classifying text:', text);

            const prompt = classificationPrompt + '\n' + classificationLabels.join(', ');

            const result = await openai.chat.completions.create({
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: text },
                ],
                model: classificationModel,
            });

            const classificationResult = result.choices?.[0]?.message?.content;

            if (!classificationResult) {
                console.log('No classification data found', result);
                return res.sendStatus(500);
            }

            console.log('Classification result:', classificationResult);

            for (const label of classificationLabels) {
                if (classificationResult.toLowerCase().includes(label.toLowerCase())) {
                    return res.json({ classification: [{ label: label, score: 1.0 }] });
                }
            }

            console.error('No matching label found');
            return res.sendStatus(500);
        } catch (error) {
            console.error('Classification failed:', error);
            return res.sendStatus(500);
        }
    });
}

if (isModuleEnabled('embeddings')) {
    app.post('/api/embeddings/compute', async (req, res) => {
        try {
            const embeddingModel = config.openAI?.embeddingModel ?? 'text-embedding-3-small';
            const text = req.body.text;

            if (!text) {
                console.error('No text provided');
                return res.sendStatus(400);
            }

            console.log('Computing embeddings for:', text);

            const openai = new OpenAI({
                apiKey: openAIApiKey,
                baseURL: openAIBaseUrl,
            });

            const result = await openai.embeddings.create({
                model: embeddingModel,
                input: text,
            });

            if (!result.data.length) {
                console.log('No embeddings data found', result);
                return res.sendStatus(500);
            }

            console.log('Embeddings result:', result.data);
            const embedding = typeof text === 'string' ? result.data[0].embedding : result.data.map(d => d.embedding);

            return res.json({ embedding });
        } catch (error) {
            console.error('Embeddings failed:', error);
            return res.sendStatus(500);
        }
    });
}

async function postSetupTasks() {
    const url = `http://${hostname}:${port}`;
    console.log(`Extras Lite is running on ${chalk.green(url)}`);

    if (share) {
        const tunnel = await localtunnel({ port });
        console.log(`Public tunnel is available at ${chalk.green(tunnel.url)}`);
    }
}

createServer(app).listen(
    Number(port),
    hostname,
    postSetupTasks,
);
