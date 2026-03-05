// utils.js - Toast, 列印, 型別定義, 常數, 工具函數

// ==================== Toast 通知系統 ====================
let _toastRoot = null;
let _toastClearTimer = null; // ★ 追蹤當前 toast 的清除計時器
const showToast = (message, type = 'success', duration = 3000) => {
    let toastEl = document.getElementById('toast-container');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'toast-container';
        toastEl.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;';
        document.body.appendChild(toastEl);
    }
    if (!_toastRoot) _toastRoot = ReactDOM.createRoot(toastEl);
    // ★ 修正：取消前一個 toast 的清除計時器，避免清除到新的 toast
    if (_toastClearTimer) { clearTimeout(_toastClearTimer); _toastClearTimer = null; }
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1', warn: '#f59e0b' };
    _toastRoot.render(React.createElement('div', {
        style: {
            background: colors[type] || colors.success,
            color: '#fff', padding: '1.2rem 2rem', borderRadius: '1.2rem',
            fontSize: '1.4rem', fontWeight: '900', boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            animation: 'fade-in 0.3s ease', maxWidth: '90vw', textAlign: 'center', lineHeight: '1.4'
        }
    }, message));
    _toastClearTimer = setTimeout(() => { _toastRoot && _toastRoot.render(null); _toastClearTimer = null; }, duration);
};

// ==================== 全域列印 Root ====================
let _printRoot = null;
const renderToPrintContainer = (component) => {
    const printEl = document.getElementById('print-container');
    if (!printEl) return;
    printEl.style.display = 'block';
    if (!_printRoot) _printRoot = ReactDOM.createRoot(printEl);
    _printRoot.render(component);
};

// ==================== 型別定義 ====================
/**
 * @typedef {Object} MenuItem
 * @property {string} id
 * @property {string} name
 * @property {string} [itemShortName]
 * @property {string} [printShortName]
 * @property {number} price
 * @property {string} [description]        - 菜單卡片描述（品名下方顯示）
 * @property {string} [hoverDescription]    - 懸浮說明彈窗內容（ⓘ按鈕觸發）
 * @property {boolean} [isAvailable]
 * @property {boolean} [isHidden]
 * @property {string} [image]
 * @property {string} [weight]
 * @property {Object} [customizations]
 * @property {string[]} [customizationOrder]
 * @property {boolean} [isHoverInfoEnabled]
 */

/**
 * @typedef {Object} MenuCategory
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {MenuItem[]} items
 */

/**
 * @typedef {Object} OptionItem
 * @property {string} name
 * @property {number} [price]
 * @property {boolean} [isAvailable]
 * @property {boolean} [isHidden]
 * @property {number} [quantity]
 * @property {string} [shortName]
 * @property {number} [choices]
 * @property {string} [groupLabel]
 */

/**
 * @typedef {Object} Addon
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} [category]
 * @property {boolean} [isAvailable]
 * @property {boolean} [isHidden]
 * @property {number} [quantity]
 * @property {string} [shortName]
 */

/**
 * @typedef {Object} CartItem
 * @property {string} cartId
 * @property {MenuItem} item
 * @property {number} quantity
 * @property {number} totalPrice
 * @property {number} unitPriceWithExtras
 * @property {Object.<string, number>} [donenesses]
 * @property {OptionItem[]} [sauces]
 * @property {Object.<string, number>} [drinks]
 * @property {Addon[]} [addons]
 * @property {Object.<string, OptionItem[]>} [dynamicSelections]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} GroupMeta
 * @property {string} title
 * @property {number} limit
 * @property {boolean} isAvailable
 * @property {boolean} isHidden
 */

/**
 * @typedef {Object} GlobalOptions
 * @property {OptionItem[]} [sauces]
 * @property {OptionItem[]} [drinks]
 * @property {Object.<string, OptionItem[]>} [options]
 * @property {Object.<string, GroupMeta>} [groupMeta]
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {CartItem[]} items
 * @property {number} totalPrice
 * @property {number} subtotal
 * @property {number} taxAmount
 * @property {number} totalWithTax
 * @property {string} orderType
 * @property {string} status
 * @property {number} createdAt
 * @property {Object} [takeoutOptions]
 * @property {Object} [customerInfo]
 * @property {number} [guestCount]
 */

/**
 * @typedef {Object} TakeoutOptions
 * @property {boolean} noCut
 * @property {boolean} needCutlery
 */

/**
 * @typedef {Object} CustomerNotice
 * @property {string} id
 * @property {string} text
 * @property {string} [textEn]
 * @property {boolean} isEnabled
 * @property {boolean} isUrgent
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [tag]
 * @property {string} [color]
 * @property {number} [priority]
 */

/**
 * @typedef {Object} ContactInfo
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string} iconType
 * @property {boolean} isEnabled
 * @property {string} color
 */

/**
 * @typedef {Object} CarouselSlide
 * @property {string} id
 * @property {string} image
 * @property {string} title
 * @property {string} [subtitle]
 * @property {boolean} isEnabled
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [animationType]
 */

/**
 * @typedef {Object} SalesStats
 * @property {number} totalRevenue
 * @property {number} orderCount
 * @property {Array<{id: string, name: string, quantity: number, revenue: number}>} popularItems
 * @property {Array<{period: string, revenue: number}>} salesTrend
 * @property {Array<{name: string, count: number}>} sauceRankings
 * @property {Array<{name: string, count: number}>} addonRankings
 */

/**
 * @typedef {Object} Snapshot
 * @property {string} id
 * @property {number} timestamp
 * @property {string} date
 * @property {string} note
 * @property {string} type
 * @property {Object} data
 * @property {string} [size]
 */

/**
 * @typedef {Object} SysConfig
 * @property {string} shopName
 * @property {string} shopSlogan
 * @property {Object} featureToggles
 * @property {Object} content
 * @property {Object} visualSettings
 * @property {Object} layoutConfig
 * @property {Array} designHistory
 */

/**
 * @typedef {Object} DesignHistoryEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} label
 * @property {Object} visualSettings
 * @property {Object} layoutConfig
 */

// ==================== 常數定義 ====================
const DEFAULT_SYS_CONFIG = {
    shopName: '',
    shopSlogan: '',
    frontendEnabled: true,  // 預設啟用前台
    featureToggles: {
        hoverInfo: true,
        customerNotices: true,
        salesRanking: true,      // BUG-04 fix: 統一用 salesRanking（移除廢棄的 salesRank）
        brandStory: true,
        stealthMenu: false,
        marquee: true,
        brandStoryPanel: true,
        homeCarousel: true,
        autoBackup: true
    },
    content: {
        brandStoryExtended: { chapters: [], config: { placement: 'top' } },
        customerNotice: [],
        contacts: [],
        qrCodes: [],  // 改為陣列，支援動態新增多個
        salesRankConfig: {
            isEnabled: true,
            marqueeSpeed: 30,
            manualOverrides: [],
            marqueeAnnouncements: []
        },
        homeCarousel: [],
        leftStealthMenu: [],
        rightStealthMenu: []
    },
    visualSettings: {
        primaryColor: '#4f46e5',
        secondaryColor: '#059669',
        backgroundColor: '#f8fafc',
        surfaceColor: '#ffffff',
        accentColor: '#d97706'
    },
    layoutConfig: {
        type: 'CLASSIC_GRID',
        cardStyle: 'rounded-2xl',
        showWeights: true
    },
    designHistory: []
};


// ==================== 深層合併工具 ====================
const deepMergeConfig = (base, patch) => ({
    ...base,
    ...patch,
    featureToggles: { ...(base.featureToggles || {}), ...(patch.featureToggles || {}) },
    content: { ...(base.content || {}), ...(patch.content || {}) },
    visualSettings: { ...(base.visualSettings || {}), ...(patch.visualSettings || {}) },
    layoutConfig: { ...(base.layoutConfig || {}), ...(patch.layoutConfig || {}) },
    // ★ 修正：designHistory 不在 patch 時明確繼承 base，防止意外清空
    designHistory: patch.designHistory !== undefined ? patch.designHistory : (base.designHistory || [])
});

// FIX: 統一 DEFAULT_GROUPS，添加 required 屬性和前台需要的所有 key (V6.5.2)
const DEFAULT_GROUPS = [
    { key: 'doneness', title: '熟度 (Doneness)', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'sauces', title: '沾醬 (Sauces)', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'drinks', title: '飲料 (Drinks)', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'drinkChoice', title: '飲料選擇', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'sauceChoice', title: '沾醬選擇', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'componentChoice', title: '炸物選擇', limit: 2, required: 2, isAvailable: true, isHidden: false },
    { key: 'sideChoice', title: '附餐選擇', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'dessertChoice', title: '甜品選擇', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'pastaChoice', title: '義麵選擇', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'notes', title: '備註 (Notes)', limit: 1, required: 0, isAvailable: true, isHidden: false },
    { key: 'addons', title: '其它加購 (Addons)', limit: 5, required: 0, isAvailable: true, isHidden: false },
    { key: 'setDetailA', title: '選項群組 A', limit: 1, required: 1, isAvailable: true, isHidden: false },
    { key: 'setDetailB', title: '選項群組 B', limit: 1, required: 1, isAvailable: true, isHidden: false }
];

const MENU_DATA = [
    {
        id: 'cat-1',
        title: '頂級牛排 / Premium Steaks',
        description: '嚴選 Prime 級牛肉，口感絕佳',
        items: [
            { 
                id: 'item-1', 
                name: '肋眼牛排 / Ribeye', 
                price: 1280, 
                description: '油花分布均勻，口感軟嫩', 
                weight: '12oz', 
                isAvailable: true, 
                isHidden: false, 
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            },
            { 
                id: 'item-2', 
                name: '菲力牛排 / Filet Mignon', 
                price: 1580, 
                description: '最軟嫩的部位，幾乎沒有油脂', 
                weight: '8oz', 
                isAvailable: true, 
                isHidden: false, 
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            },
            { 
                id: 'item-3', 
                name: '紐約客 / New York Strip', 
                price: 1380, 
                description: '肉質紮實，風味濃郁', 
                weight: '12oz', 
                isAvailable: true, 
                isHidden: false, 
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            }
        ]
    },
    {
        id: 'cat-2',
        title: '經典主餐 / Classics',
        description: '餐廳招牌推薦',
        items: [
            { 
                id: 'item-4', 
                name: '碳烤豬肋排 / BBQ Ribs', 
                price: 980, 
                description: '慢火碳烤，肉質軟嫩', 
                weight: '全排', 
                isAvailable: true, 
                isHidden: false, 
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            },
            { 
                id: 'item-5', 
                name: '香煎鮭魚 / Pan-seared Salmon', 
                price: 880, 
                description: '新鮮鮭魚，外酥內嫩', 
                weight: '300g', 
                isAvailable: true, 
                isHidden: false, 
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            }
        ]
    },
    {
        id: 'cat-3',
        title: '板腱牛排+炸雞或炸魚套餐 / Chuck Tender Combo',
        description: '板腱牛排搭配炸雞或炸魚，超值組合',
        items: [
            {
                id: 'item-combo-1',
                name: '板腱牛排+炸雞或炸魚套餐 17OZ',
                price: 299,
                description: '3OZ板腱牛排 + 4OZ炸雞或炸魚，超值輕食組合',
                weight: '17OZ (3OZ牛排+4OZ雞/魚)',
                isAvailable: true,
                isHidden: false,
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            },
            {
                id: 'item-combo-2',
                name: '板腱牛排+炸雞或炸魚套餐 10OZ',
                price: 399,
                description: '6OZ板腱牛排 + 4OZ炸雞或炸魚，豐盛主餐組合',
                weight: '10OZ (6OZ牛排+4OZ雞/魚)',
                isAvailable: true,
                isHidden: false,
                isHoverInfoEnabled: true,
                customizations: {},
                customizationOrder: []
            }
        ]
    }
];

const ADDONS = []; // 加購品項由後台資料庫管理，無預設硬寫資料

const DEFAULT_OPTIONS = {}; // 所有選項（熟度、沾醬、飲料等）由後台資料庫管理，無預設硬寫資料

const DEFAULT_GROUP_META = {}; // 群組 meta（熟度/加購等）由後台資料庫管理，無預設硬寫資料

const THEME_PRESETS = [
    {
        id: 'indigo-classic',
        name: '經典靛藍',
        visual: {
            primaryColor: '#4f46e5',
            secondaryColor: '#059669',
            backgroundColor: '#f8fafc',
            surfaceColor: '#ffffff',
            accentColor: '#d97706'
        },
        layoutType: 'CLASSIC_GRID'
    },
    {
        id: 'emerald-elegant',
        name: '翡翠優雅',
        visual: {
            primaryColor: '#059669',
            secondaryColor: '#4f46e5',
            backgroundColor: '#f0fdf4',
            surfaceColor: '#ffffff',
            accentColor: '#b45309'
        },
        layoutType: 'ELEGANT_LIST'
    },
    {
        id: 'rose-modern',
        name: '玫瑰現代',
        visual: {
            primaryColor: '#e11d48',
            secondaryColor: '#2563eb',
            backgroundColor: '#fff1f2',
            surfaceColor: '#ffffff',
            accentColor: '#7c3aed'
        },
        layoutType: 'WATERFALL'
    }
];

