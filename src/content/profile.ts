// ここを書き換える: 本番用の名前・タグライン・自己紹介・連絡先に置き換える

export const PROFILE: {
  name: string;
  tagline: string;
  about: string[];
  contact: { label: string; url: string }[];
} = {
  name: 'YOUR NAME',
  tagline: 'つくる人。',
  about: [
    'ここに自己紹介の一段落目が入ります。',
    'ここに自己紹介の二段落目が入ります。',
  ],
  contact: [
    { label: 'GitHub', url: 'https://github.com/example' },
    { label: 'Email', url: 'mailto:example@example.com' },
  ],
};
