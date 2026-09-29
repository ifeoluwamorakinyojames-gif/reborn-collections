import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'brand', title: 'Brand', type: 'string', initialValue: 'REBORN' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', initialValue: 'Wholesale & Retail Fashion' }),
    defineField({ name: 'heroTitle', title: 'Hero title', type: 'string', initialValue: 'Style for Everyone' }),
    defineField({ name: 'heroText', title: 'Hero text', type: 'text', rows: 3 }),
    defineField({ name: 'logo', title: 'Logo', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'heroImage', title: 'Hero image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'whatsapp', title: 'WhatsApp', type: 'string' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string' }),
    defineField({ name: 'address', title: 'Address', type: 'string' }),
    defineField({ name: 'comboSaleEyebrow', title: 'Combo sale small heading', type: 'string', initialValue: 'LIMITED PROMO' }),
    defineField({ name: 'comboSaleTitle', title: 'Combo sale title', type: 'string', initialValue: 'Combo Sales' }),
    defineField({ name: 'comboSaleText', title: 'Combo sale description', type: 'text', rows: 3 }),
    defineField({
      name: 'metaPixelId',
      title: 'Meta Pixel ID',
      type: 'string',
      description: 'Leave blank to disable Meta tracking.',
    }),
  ],
});
