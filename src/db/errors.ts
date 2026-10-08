// Postgres hata kodları: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505";

/** Hata bir unique kısıtı ihlalinden mi kaynaklanıyor? */
export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === UNIQUE_VIOLATION;
}
