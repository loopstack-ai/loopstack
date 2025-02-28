import path from "path";
import fs from "fs";
import {MainConfigInterface} from "@loopstack/shared";
import * as yaml from 'js-yaml';

export function loadConfiguration(directoryPath: string): any[] {
    const fullPath = path.join(process.cwd(), directoryPath);

    const configs: MainConfigInterface[] = [];
    try {
        const absolutePath = path.resolve(fullPath);
        const files = fs.readdirSync(absolutePath);

        files.forEach((file) => {
            const filePath = path.join(absolutePath, file);
            if (
                fs.statSync(filePath).isFile() &&
                file.endsWith('.loopstack.yaml')
            ) {
                configs.push(yaml.load(fs.readFileSync(filePath, 'utf8')));
            }
        });
    } catch (error) {
        console.error(`Error loading config files from ${directoryPath}:`, error);
    }

    return configs;
}