// Monta o payload Pix "Copia e Cola" (BR Code, padrão EMV do Banco Central)
// usado para gerar o QR Code estático de cobrança exibido nos recibos.

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

function sanitize(value: string, maxLength: number): string {
  const stripped = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim();
  return (stripped || 'SYSVEX').slice(0, maxLength);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
}

export function buildPixPayload(params: PixPayloadParams): string {
  const merchantName = sanitize(params.merchantName, 25);
  const merchantCity = sanitize(params.merchantCity, 15);
  const txid = sanitize(params.txid ?? '***', 25) || '***';

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', params.pixKey);

  const parts = [
    tlv('00', '01'),
    tlv('01', params.amount != null ? '12' : '11'),
    tlv('26', merchantAccountInfo),
    tlv('52', '0000'),
    tlv('53', '986'),
    params.amount != null ? tlv('54', params.amount.toFixed(2)) : '',
    tlv('58', 'BR'),
    tlv('59', merchantName),
    tlv('60', merchantCity),
    tlv('62', tlv('05', txid)),
  ].join('');

  const withCrcId = `${parts}6304`;
  return withCrcId + crc16(withCrcId);
}
