import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { brandSchema } from '@/brand/schema';
import { readBrand, listBrandSlugs } from '@/brand/files';
import { contrast, contrastRatio, darkShades, brandCssVars, heroBase } from '@/brand/theme';

describe('brand.json v2', () => {
  it('every brand in /brands is valid', async () => {
    const slugs = await listBrandSlugs();
    expect(slugs).toEqual(expect.arrayContaining(['druri-design', 'lumi-dyer']));
    for (const slug of slugs) {
      const raw = JSON.parse(fs.readFileSync(`brands/${slug}/brand.json`, 'utf8'));
      expect(() => brandSchema.parse(raw)).not.toThrow();
      expect(raw.slug).toBe(slug);
    }
  });

  it('loads a brand with its logo as a data URL', async () => {
    const b = await readBrand('lumi-dyer');
    expect(b.fallback).toBe(false);
    expect(b.brand.depositWord).toBe('Kapar');
    expect(b.logoUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('falls back to the neutral brand for missing, invalid or unsafe slugs', async () => {
    for (const slug of [undefined, '', 'does-not-exist', '../etc', 'Druri Design']) {
      const b = await readBrand(slug);
      expect(b.fallback).toBe(true);
      expect(b.brand.slug).toBe('neutral');
    }
  });

  it('rejects bad colours and fills defaults', () => {
    const base = { schemaVersion: 2, slug: 'x', companyName: 'X', shortName: 'X', logo: { src: 'logo.svg' }, businessType: 'kitchens' };
    expect(() => brandSchema.parse({ ...base, colors: { primary: 'red', accent: '#000000', background: '#FFFFFF', text: '#000000' } })).toThrow();
    const ok = brandSchema.parse({ ...base, colors: { primary: '#365C50', accent: '#B99A70', background: '#FFFFFF', text: '#1A1A1A' } });
    expect(ok.depositWord).toBe('Avans');
    expect(ok.contact.phone).toBe('');
    expect(ok.languages).toEqual(['sq']);
  });
});

describe('theme', () => {
  it('derives the same dark shades as the prototype', () => {
    // Values from prototype/js/app.js OT.darkShades for the two sample brands.
    expect(darkShades('#365C50')).toEqual({ ink: '#A4D6C6', fill: '#397F69' });
    expect(darkShades('#45628F')).toEqual({ ink: '#A4B7D6', fill: '#426192' });
  });

  it('keeps dark navy, green and brown brands readable on dark cards', () => {
    for (const hex of ['#1F3A5F', '#2F5D50', '#6B3F24']) {
      const { ink, fill } = darkShades(hex);
      expect(contrast(ink)).toBe('#1A1A1A'); // ink is light
      expect(['#FFFFFF', '#1A1A1A']).toContain(contrast(fill));
    }
  });

  it('picks readable text colours', () => {
    expect(contrast('#365C50')).toBe('#FFFFFF');
    expect(contrast('#F5F5F5')).toBe('#1A1A1A');
  });

  it('picks the stronger text colour for mid-light brand colours', () => {
    // Review finding: #90A0B0 and the Druri accent #B99A70 got white at ~2.7:1.
    for (const hex of ['#90A0B0', '#B99A70', '#B58D5E', '#7FA88F', '#E0B040', '#5BA3D0']) {
      const ink = contrast(hex);
      const other = ink === '#FFFFFF' ? '#1A1A1A' : '#FFFFFF';
      expect(contrastRatio(hex, ink)).toBeGreaterThanOrEqual(contrastRatio(hex, other));
      expect(contrastRatio(hex, ink)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast('#90A0B0')).toBe('#1A1A1A');
    expect(contrast('#B99A70')).toBe('#1A1A1A');
  });

  it('keeps white text readable on the Sot headline for light primaries', () => {
    expect(heroBase('#365C50')).toBe('#365C50'); // dark primaries stay as they are
    for (const hex of ['#90A0B0', '#B99A70', '#E0B040', '#F5F5F5']) {
      expect(contrastRatio(heroBase(hex), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('writes the brand layer of tokens', () => {
    const v = brandCssVars({ primary: '#365C50', accent: '#B99A70', background: '#FFFFFF', text: '#1A1A1A' });
    expect(v['--brand-primary']).toBe('#365C50');
    expect(v['--brand-ink-dark']).toMatch(/^#[0-9A-F]{6}$/);
  });
});
