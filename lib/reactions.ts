
export type ReactionTone = 'funny' | 'ironic' | 'inspiring' | 'strict';
export type ReactionMood = 'happy' | 'shocked' | 'sad' | 'sarcastic' | 'neutral';

export interface ReactionTemplate {
  id: string;
  trigger_type: string;
  messages: string[];
  tone: ReactionTone;
  mood: ReactionMood;
}

export const REACTION_TEMPLATES: ReactionTemplate[] = [
  {
    id: 'high_expense_coffee',
    trigger_type: 'HIGH_EXPENSE_COFFEE', // > 70k
    messages: [
      "Ly cà phê này có dát vàng không mà giá đó bạn tôi ơi? ☕️",
      "Uống xong ly này chắc tỉnh táo đến... kỳ lương sau luôn nhỉ?",
      "Cà phê ngon đấy, nhưng ví của bạn đang khóc thầm kìa."
    ],
    tone: 'ironic',
    mood: 'sarcastic'
  },
  {
    id: 'high_expense_meal',
    trigger_type: 'HIGH_EXPENSE_MEAL', // > 500k
    messages: [
      "Ăn sang chảnh thế! Hy vọng sếp không thấy tin nhắn này.",
      "Một bữa ăn bằng cả tuần đi chợ. Đại gia là đây chứ đâu! 🦞",
      "Ngon miệng nhé! Nhớ về nhà ăn mì tôm bù lại nha."
    ],
    tone: 'funny',
    mood: 'shocked'
  },
  {
    id: 'budget_burst',
    trigger_type: 'BUDGET_BURST',
    messages: [
      "Báo động đỏ! Ngân sách đang cháy khét lẹt rồi! 🔥",
      "Bạn ơi, mình dừng lại đi. Tiền không mọc trên cây đâu.",
      "Cứ đà này thì cuối tháng cạp đất mà ăn thật đấy."
    ],
    tone: 'strict',
    mood: 'sad'
  },
  {
    id: 'first_asset',
    trigger_type: 'FIRST_ASSET',
    messages: [
      "Chúc mừng! Viên gạch đầu tiên cho đế chế tài chính của bạn. 🏰",
      "Tuyệt vời! Tiền đẻ ra tiền là đây.",
      "Hoan hô! Bạn đã chính thức trở thành nhà đầu tư."
    ],
    tone: 'inspiring',
    mood: 'happy'
  },
  {
    id: 'debt_king',
    trigger_type: 'DEBT_KING',
    messages: [
      "Áp lực nợ nần có vẻ hơi lớn nhỉ? Cố lên bạn tôi ơi.",
      "Nợ là động lực, nhưng đừng để nó thành gánh nặng nhé.",
      "Cẩn thận nhé, lãi suất đang rình rập đấy!"
    ],
    tone: 'inspiring',
    mood: 'sad'
  },
  {
    id: 'saving_hero',
    trigger_type: 'SAVING_HERO',
    messages: [
      "Quá đỉnh! Tiết kiệm được chừng này là cả một nỗ lực lớn. 👏",
      "Ví dày lên rồi! Tiếp tục phát huy nhé.",
      "Thần tài đang gõ cửa nhà bạn đấy!"
    ],
    tone: 'inspiring',
    mood: 'happy'
  }
];

export const getRandomReaction = (triggerType: string): ReactionTemplate | null => {
  const template = REACTION_TEMPLATES.find(t => t.trigger_type === triggerType);
  if (!template) return null;
  return template;
};

export const getRandomMessage = (template: ReactionTemplate): string => {
  const idx = Math.floor(Math.random() * template.messages.length);
  return template.messages[idx];
};
