import { defineField, defineType } from 'sanity';

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Product name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Collection',
      type: 'string',
      options: {
        list: ['Women', 'Men', 'Unisex', 'Kids', 'Wigs', 'Shoes', 'Perfumes', 'Accessories'],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'subcategory',
      title: 'Men subsection',
      type: 'string',
      description: 'Use for Men products when needed.',
      options: { list: ['Denim', 'Baggy Jean'] },
    }),
    defineField({ name: 'brand', title: 'Brand', type: 'string', initialValue: 'REBORN' }),
    defineField({ name: 'price', title: 'Retail price (₦)', type: 'number', validation: (r) => r.required().min(0) }),
    defineField({ name: 'wholesalePrice', title: 'Wholesale price (₦)', type: 'number', validation: (r) => r.min(0) }),
    defineField({ name: 'salePrice', title: 'Sale price (₦)', type: 'number', validation: (r) => r.min(0) }),
    defineField({
      name: 'badge',
      title: 'Promo',
      type: 'string',
      options: { list: ['New Arrival', 'Combo Sale', 'Sale', 'Best Seller', 'Featured'] },
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 4 }),
    defineField({ name: 'inStock', title: 'In stock', type: 'boolean', initialValue: true }),
    defineField({
      name: 'sizes',
      title: 'Sizes',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'colors',
      title: 'Colours',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'images',
      title: 'Product images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (r) => r.required().min(1).max(15),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
      media: 'images.0',
    },
  },
});
