// ここを書き換える: 実際の制作物に置き換える

export type Work = {
  id: string;
  title: string;
  summary: string;
  url?: string;
  image?: string;
  tags?: string[];
};

export const WORKS: Work[] = [
  {
    id: 'work-one',
    title: 'サンプル作品1',
    summary: 'ダミーの説明文です。',
    url: 'https://example.com/work-one',
    tags: ['sample'],
  },
  {
    id: 'work-two',
    title: 'サンプル作品2',
    summary: 'ダミーの説明文です。',
    url: 'https://example.com/work-two',
    tags: ['sample'],
  },
  {
    id: 'work-three',
    title: 'サンプル作品3',
    summary: 'ダミーの説明文です。',
    tags: ['sample'],
  },
];
