const logoUrl = `${import.meta.env.BASE_URL}kaira-logo.png?rev=20261009-2`;

export const BRAND = {
  name: 'Kaira Africa',
  tagline: 'Know Your Business. Grow Your Business.',
  logoUrl,
  support: {
    phone: '+220 87 407 1510',
    address: 'Royal Africa House, (Opposite Indian Farm) OIC Highway, Sukuta, The Gambia',
    whatsappUrl: 'https://wa.me/220874071510',
  },
} as const;

export { logoUrl };
