const SUFFIX_RE =
  /(?:壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/;

export function toShortName(fullName: string): string {
  return fullName.replace(SUFFIX_RE, "");
}
