export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 14); // Limita tamanho: 000.000.000-00
};

export const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 18); // Limita tamanho: 00.000.000/0000-00
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .slice(0, 15); // Limita tamanho: (11) 99999-9999
};

export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .slice(0, 9); // Limita tamanho: 00000-000
};

export const maskDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{4})\d+?$/, '$1')
    .slice(0, 10);
};

export const unmask = (value: string) => {
    return value.replace(/\D/g, '');
};

// Sanitização básica contra XSS e Injeção
export const sanitizeInput = (value: string) => {
  if (!value) return '';
  // Remove tags HTML
  let clean = value.replace(/<\/?[^>]+(>|$)/g, "");
  // Remove caracteres potencialmente perigosos para injeção simples
  // Mantemos acentos e pontuação básica
  // clean = clean.replace(/[<>]/g, ""); 
  return clean;
};