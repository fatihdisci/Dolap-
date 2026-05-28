export type Kategori = 'üst' | 'dış' | 'alt' | 'ayakkabı' | 'aksesuar';
export type Mevsim = 'ilkbahar' | 'yaz' | 'sonbahar' | 'kış';

export type Garment = {
  id: string;
  driveOrigId: string;
  driveIsoId: string | null;
  kategori: Kategori;
  altKategori: string;
  renkler: string[];
  desen: string;
  mevsim: Mevsim[];
  etiketler: string[];
  olusturma: string;
};

export type Outfit = {
  id: string;
  garmentIds: string[];
  kaynak: 'ai' | 'kullanici';
  not: string;
  olusturma: string;
};

export type Metadata = {
  garments: Garment[];
  outfits: Outfit[];
  updatedAt: string;
};

export type DriveFolder = {
  id: string;
  name: string;
};

export type StoredFolderIds = {
  root: string;
  orijinal: string;
  izole: string;
  metadataId: string;
};
