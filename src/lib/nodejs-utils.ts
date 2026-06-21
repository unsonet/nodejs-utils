import path from "path";
import fetch from 'node-fetch';
import fs from 'fs';
import fsp from "fs/promises";

/**
 * Функция для получения текста файла
 * @param {string} filePath - Путь к файлу (относительный или абсолютный URL)
 * @returns {Promise<string>} - Возвращает Promise с текстом файла
 */
export async function getFileContent(filePath) {
  try {
    // Проверяем, является ли путь относительным или абсолютным
    if (path.isAbsolute(filePath) || filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Если путь абсолютный, используем node-fetch для получения файла по URL
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Ошибка при получении файла: ${response.statusText}`);
      }
      const text = await response.text();
      return text;
    } else {
      // Если путь относительный, используем fs.readFile для чтения локального файла
      const text = await fsp.readFile(filePath, 'utf8');
      return text;
    }
  } catch (error) {
    throw new Error(`Ошибка при чтении файла: ${error.message}`);
  }
}


/**
 * Injects serialized environment variables inline into HTML file
 * between <!-- ENV_BEGIN --> and <!-- ENV_END --> markers.
 *
 * If markers are missing, function will throw an error.
 *
 * @param {string} filename - Path to HTML template file
 * @param {string[]} serializedEnvs - Array of serialized JS statements
 * @returns {void}
 */
export async function injectEnvInline(filename, serializedEnvs) {
  let template = await fsp.readFile(filename, 'utf8');

  const beginMarker = '<!-- ENV_BEGIN -->';
  const endMarker = '<!-- ENV_END -->';

  const startIndex = template.indexOf(beginMarker);
  const endIndex = template.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('ENV markers not found in template');
  }

  if (endIndex < startIndex) {
    throw new Error('ENV_END found before ENV_BEGIN');
  }

  const scriptStr =
    `<script>\n${serializedEnvs.join('\n')}\n</script>`;

  const before = template.slice(0, startIndex);
  const after = template.slice(endIndex + endMarker.length);

  const result = `${before}${scriptStr}${after}`;

  await fsp.writeFile(filename, result, 'utf8');
  return;
}





/*===*/
export function getArg(args, name, short?) {
  const index = args.findIndex(
    i => i === `--${name}` || i === `-${short}`
  );

  if (index === -1) return undefined;

  return args[index + 1];
}

export function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

// Simple CLI args parsing
export function parseArgs(argv: string[]) {
  const res: Record<string, any> = {};

  const normalizeKey = (key: string) =>
    key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const normalizeValue = (val: any) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith('--')) continue;

    const eqIndex = arg.indexOf('=');

    let key: string;
    let val: any = true;

    // --key=value
    if (eqIndex !== -1) {
      key = arg.slice(2, eqIndex);
      val = arg.slice(eqIndex + 1);

    } else {
      key = arg.slice(2);

      const next = argv[i + 1];

      // --key value
      if (next && !next.startsWith('-')) {
        val = next;
        i++;
      }
    }

    const normalizedKey = normalizeKey(key);
    res[normalizedKey] = normalizeValue(val);
  }

  return res;
}

export function ensureExt(name, ext) {
  if (!path.extname(name)) return name + ext;
  return name;
}

export function uniquePath(dir, baseName) {
  const ext = path.extname(baseName);
  const base = baseName.slice(0, -ext.length);
  let attempt = 0;
  let candidate = baseName;
  while (fs.existsSync(path.join(dir, candidate))) {
    attempt++;
    candidate = `${base} (${attempt})${ext}`;
  }
  return candidate;
}