import "server-only";
import { parseEnv } from "./env";

// Ortam değişkenleri uygulama açılırken bir kez doğrulanır. "server-only",
// bu dosyanın (ve içindeki gizli anahtarların) yanlışlıkla tarayıcıya giden
// koda eklenmesini derleme sırasında engeller.
export const env = parseEnv(process.env);
