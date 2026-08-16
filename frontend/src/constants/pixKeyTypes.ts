export type PixKeyType = 'PHONE' | 'CPF' | 'CNPJ' | 'RANDOM';

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  PHONE: 'Número de celular',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  RANDOM: 'Chave aleatória',
};

export const PIX_KEY_TYPE_PLACEHOLDERS: Record<PixKeyType, string> = {
  PHONE: '+55 11 91234-5678',
  CPF: '000.000.000-00',
  CNPJ: '00.000.000/0001-00',
  RANDOM: '123e4567-e89b-12d3-a456-426614174000',
};

export const PIX_KEY_TYPES = Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[];
