export const ITEM_CATEGORIES = {
  weapon: 'weapon',
  shield: 'shield',
  spell: 'spell',
  item: 'item',
}

const spellScrollIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="paper" x1="20" x2="76" y1="10" y2="86">
        <stop offset="0" stop-color="#f5e6b6"/>
        <stop offset=".55" stop-color="#b8945b"/>
        <stop offset="1" stop-color="#4b3320"/>
      </linearGradient>
      <radialGradient id="rune" cx="50%" cy="48%" r="45%">
        <stop offset="0" stop-color="#f6fbff"/>
        <stop offset=".45" stop-color="#8fbaff"/>
        <stop offset="1" stop-color="#24366f" stop-opacity=".2"/>
      </radialGradient>
      <filter id="glow" x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="2.8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M25 14h38c8 0 13 5 13 12v48c0 5-4 8-9 8H30c-7 0-11-4-11-10V21c0-4 2-7 6-7Z" fill="url(#paper)" stroke="#e8c982" stroke-width="3"/>
    <path d="M26 22h42M27 72h35" stroke="#5a381d" stroke-width="3" opacity=".55"/>
    <circle cx="48" cy="48" r="18" fill="url(#rune)" filter="url(#glow)" opacity=".9"/>
    <path d="M48 31v34M35 48h26M40 36l16 24M56 36 40 60" stroke="#edf7ff" stroke-width="3" stroke-linecap="round" opacity=".88"/>
  </svg>
`)}`

export const ITEM_DEFS = {
  spell_scroll: {
    id: 'spell_scroll',
    name: '新法术卷轴',
    category: ITEM_CATEGORIES.spell,
    icon: spellScrollIcon,
  },
  estusFlask: {
    id: 'estusFlask',
    name: '元素瓶',
    category: ITEM_CATEGORIES.item,
    icon: null,
  },
  fish: {
    id: 'fish',
    name: '鱼',
    category: ITEM_CATEGORIES.item,
    icon: null,
  },
}

export const PICKUP_DEFS = [
  {
    id: 'pickup_spell_scroll_01',
    itemId: 'spell_scroll',
    x: -13,
    z: 44,
    count: 1,
    prompt: '捡起',
    auraScale: 0.4,
  },
]
