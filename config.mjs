import * as fs from 'fs';
import _ from 'lodash';
import * as yaml from 'yaml';
import { Chalk } from 'chalk';

const chalk = new Chalk();
const DEFAULT_CONFIG_PATH = './config.default.yaml';
const CONFIG_PATH = './config.yaml';

/**
 * Gets all keys from an object recursively.
 * @param {object} obj Object to get all keys from
 * @param {string} prefix Prefix to prepend to all keys
 * @returns {string[]} Array of all keys in the object
 */
function getAllKeys(obj, prefix = '') {
    if (typeof obj !== 'object' || Array.isArray(obj)) {
        return [];
    }

    return _.flatMap(Object.keys(obj), key => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            return getAllKeys(obj[key], newPrefix);
        } else {
            return [newPrefix];
        }
    });
}

function populateMissingConfigValues() {
    try {
        const defaultConfig = yaml.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
        let config = yaml.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

        // Get all keys from the original config
        const originalKeys = getAllKeys(config);

        // Use lodash's defaultsDeep function to recursively apply default properties
        config = _.defaultsDeep(config, defaultConfig);

        // Get all keys from the updated config
        const updatedKeys = getAllKeys(config);

        // Find the keys that were added
        const addedKeys = _.difference(updatedKeys, originalKeys);

        if (addedKeys.length === 0) {
            return;
        }

        console.log(`Adding missing config values to ${CONFIG_PATH}`, addedKeys);
        fs.writeFileSync(CONFIG_PATH, yaml.stringify(config));
    } catch (error) {
        console.error(chalk.red(`FATAL: Could not add missing config values to ${CONFIG_PATH}`), error);
        process.exit(1);
    }
}

/**
 * Reads the config file and returns the parsed object.
 * @returns {object} The config object
 */
export function getConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.log(chalk.yellow('Config file not found. Creating a new one...'));
        fs.cpSync(DEFAULT_CONFIG_PATH, CONFIG_PATH);
    }

    populateMissingConfigValues();
    const config = yaml.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config;
}
