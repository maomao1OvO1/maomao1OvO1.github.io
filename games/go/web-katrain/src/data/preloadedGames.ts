import leeSedolHongJansik from './sgf/__go4go_20030423_Lee-Sedol_Hong-Jansik.sgf?raw';
import choiCheolhanLeeChangho from './sgf/__go4go_20050219_Choi-Cheolhan_Lee-Changho.sgf?raw';
import choChikunORissei from './sgf/__go4go_20050427_Cho-Chikun_O-Rissei.sgf?raw';
import guLiLeeSedol from './sgf/__go4go_20051019_Gu-Li_Lee-Sedol.sgf?raw';
import leeSedolGuLi from './sgf/__go4go_20051210_Lee-Sedol_Gu-Li.sgf?raw';
import choiCheolhanLuoXihe from './sgf/__go4go_20051216_Choi-Cheolhan_Luo-Xihe.sgf?raw';
import shinJinseoKangYootaek from './sgf/__go4go_20150920_Shin-Jinseo_Kang-Yootaek.sgf?raw';

type PreloadedGame = {
  name: string;
  sgf: string;
  source: string;
};

export const PRELOADED_GAMES: PreloadedGame[] = [
  {
    name: 'Lee Sedol vs Hong Jansik - 3rd Korean KAT Cup (2003-04-23)',
    source: 'go4go.com',
    sgf: leeSedolHongJansik,
  },
  {
    name: 'Choi Cheolhan vs Lee Changho - 48th Korean Kuksu, title match #3 (2005-02-19)',
    source: 'go4go.com',
    sgf: choiCheolhanLeeChangho,
  },
  {
    name: 'Cho Chikun vs O Rissei - 43rd Japanese Judan, title match #5 (2005-04-27)',
    source: 'go4go.com',
    sgf: choChikunORissei,
  },
  {
    name: 'Gu Li vs Lee Sedol - 10th LG Cup, semi-final (2005-10-19)',
    source: 'go4go.com',
    sgf: guLiLeeSedol,
  },
  {
    name: 'Lee Sedol vs Gu Li - 7th Chinese League A, round 20 (2005-12-10)',
    source: 'go4go.com',
    sgf: leeSedolGuLi,
  },
  {
    name: 'Choi Cheolhan vs Luo Xihe - 10th Samsung Cup, semi-final 3 (2005-12-16)',
    source: 'go4go.com',
    sgf: choiCheolhanLuoXihe,
  },
  {
    name: 'Shin Jinseo vs Kang Yootaek - 2015 Korean League (2015-09-20)',
    source: 'go4go.com',
    sgf: shinJinseoKangYootaek,
  },
];
