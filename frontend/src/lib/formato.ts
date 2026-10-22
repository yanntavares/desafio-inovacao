/** "2026-10-08" ou ISO completo → "08/10/2026" sem passar por fuso (a data já vem no dia certo). */
export function formatarData(iso: string, comAno = true): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return comAno ? `${dia}/${mes}/${ano}` : `${dia}/${mes}`;
}

export function formatarDataHora(iso: string): string {
  return `${formatarData(iso, false)} ${iso.slice(11, 16)}`;
}
