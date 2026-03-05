// db.js - IndexedDB + apiService
// Auto-extracted from 1_clean.html



        // ==================== IndexedDB 服務 ====================
const DB_NAME = 'PlatinumKioskDB_V6_Local';
const DB_VERSION = 21; // 提升版本以解決版本衝突問題
const STORES = {
    MENU: 'menu',
    ADDONS: 'addons',
    OPTIONS: 'options',
    ORDERS: 'orders',
    SETTINGS: 'settings',
    META: 'meta',
    SNAPSHOTS: 'snapshots'
};

class IDBManager {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    async getDB() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => { 
                this.initPromise = null; 
                const error = request.error;
                // 處理版本錯誤
                if (error && (error.name === 'VersionError' || error.message.includes('version'))) {
                    if (confirm('⚠️ 偵測到資料庫版本衝突！\n\n這通常是因為使用了不同版本的系統。\n\n點擊「確定」清除舊資料並重新初始化系統。\n點擊「取消」刷新頁面重試。')) {
                        indexedDB.deleteDatabase(DB_NAME);
                        window.location.reload();
                    } else {
                        window.location.reload();
                    }
                }
                reject(error); 
            };
            request.onsuccess = () => { this.db = request.result; resolve(request.result); };
            request.onupgradeneeded = (event) => {
                const db = request.result;
                Object.values(STORES).forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });
            };
        });
        return this.initPromise;
    }

    async set(storeName, id, data) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const payload = ([STORES.SNAPSHOTS, STORES.ORDERS, STORES.SETTINGS].includes(storeName)) 
                ? { ...data, id } 
                : { id, data, updatedAt: Date.now() };
            const request = transaction.objectStore(storeName).put(payload);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const request = transaction.objectStore(storeName).get(id);
            request.onsuccess = () => {
                if (!request.result) return resolve(null);
                resolve([STORES.SNAPSHOTS, STORES.ORDERS, STORES.SETTINGS].includes(storeName) ? request.result : request.result.data);
            };
            request.onerror = () => resolve(null);
        });
    }

    async getAll(storeName) {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const request = transaction.objectStore(storeName).getAll();
            request.onsuccess = () => {
                if ([STORES.SNAPSHOTS, STORES.ORDERS].includes(storeName)) {
                    resolve(request.result);
                } else {
                    resolve(request.result.map(i => i.data));
                }
            };
            request.onerror = () => resolve([]);
        });
    }

    async delete(storeName, id) {
        const db = await this.getDB();
        // ★ 修正：加入 Promise 包裝，確保刪除完成才 resolve
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clearStore(storeName) {
        const db = await this.getDB();
        // ★ 修正：加入 Promise 包裝，確保清除完成才 resolve
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clearAll() {
        const db = await this.getDB();
        const stores = Object.values(STORES);
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        return new Promise(resolve => tx.oncomplete = () => resolve(true));
    }
}

const idb = new IDBManager();
const syncChannel = new BroadcastChannel('kiosk_sync_stream_v6');

// 同步脈衝（同時支援跨分頁 BroadcastChannel 與同頁 CustomEvent）
const triggerSyncPulse = (source = 'unknown') => {
    // FIX: 移除延遲，立即觸發同步避免競態 (V6.5.4)
    const ts = Date.now().toString();
    console.debug(`[Sync] 發送廣播指令 | 來源: ${source} | TS: ${ts}`);
    // 跨分頁同步
    syncChannel.postMessage({ type: 'SYNC_UI', source, ts });
    // 同頁同步（BroadcastChannel 無法自收，需用 CustomEvent）
    window.dispatchEvent(new CustomEvent('kiosk_sync', { detail: { type: 'SYNC_UI', source, ts } }));
};

// 雙語解析
const parseBilingual = (text, lang = 'zh') => {
    if (!text) return '';
    if (typeof text !== 'string') return text;
    if (!text.includes('/')) return text;
    // ★ 修正：只有斜線後方是「英文字母/數字開頭」或「空字串」才視為雙語分隔符
    // 確保「6OZ牛排+4OZ雞/魚」不被誤切，「板腱套餐 / Chuck Steak」或「板腱套餐 /」仍正確解析
    const slashIdx = text.indexOf('/');
    const afterSlash = text.slice(slashIdx + 1).trim();
    const isBilingual = afterSlash === '' || /^[A-Za-z0-9]/.test(afterSlash);
    if (!isBilingual) return text; // 非雙語格式，原樣返回
    const zh = text.slice(0, slashIdx).trim();
    const en = afterSlash || zh; // 英文留空時 fallback 中文
    return lang === 'zh' ? zh : en;
};

// 共享數據服務 (Legacy & Finance 同步)
const SharedDataService = {
    LEGACY_ADMIN_KEY: 'restaurantSystemData',
    PRO_FINANCE_KEY: 'finance_v1_transactions',

    syncOrderToLegacy: (order) => {
        try {
            const now = new Date(order.createdAt);
            const orderDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            // BUG-09 fix: 用稅前金額（subtotal）存入 legacy，若無則用 totalPrice
            const preTaxAmount = order.subtotal || order.totalPrice || 0;

            // 1. Sync to Legacy Admin (Sales Daily Report)
            const legacyRaw = localStorage.getItem(SharedDataService.LEGACY_ADMIN_KEY);
            let legacyData = legacyRaw ? JSON.parse(legacyRaw) : { dailyRecords: [], suppliers: [], expenseRecords: [], supplierRecords: [], taxRate: 5 };
            
            const existingRecordIndex = legacyData.dailyRecords.findIndex(r => r.date === orderDate);
            if (existingRecordIndex !== -1) {
                legacyData.dailyRecords[existingRecordIndex].revenue = (Number(legacyData.dailyRecords[existingRecordIndex].revenue) || 0) + preTaxAmount;
            } else {
                legacyData.dailyRecords.push({ id: Date.now(), date: orderDate, revenue: preTaxAmount, foodCost: 0, nonFoodCost: 0 });
            }
            legacyData.dailyRecords.sort((a, b) => b.date.localeCompare(a.date));
            localStorage.setItem(SharedDataService.LEGACY_ADMIN_KEY, JSON.stringify(legacyData));

            // 2. Sync to Pro Finance (Double-Entry Bookkeeping)
            const financeRaw = localStorage.getItem(SharedDataService.PRO_FINANCE_KEY);
            let financeTransactions = financeRaw ? JSON.parse(financeRaw) : [];
            const newTransaction = {
                id: Date.now() + Math.random(),
                date: orderDate,
                memo: `Kiosk Sync - Order: ${order.id.slice(-6)}`,
                lines: [
                    { account: '1000', debit: preTaxAmount, credit: 0 },
                    { account: '4000', debit: 0, credit: preTaxAmount }
                ]
            };
            financeTransactions.push(newTransaction);
            if (financeTransactions.length > 2000) financeTransactions = financeTransactions.slice(-2000);
            localStorage.setItem(SharedDataService.PRO_FINANCE_KEY, JSON.stringify(financeTransactions));

            // Broadcast to other tabs（跨分頁同步財務資料更新）
            syncChannel.postMessage({ type: 'SYNC_UI', source: 'syncOrderToLegacy', ts: Date.now().toString() });

            // 同步推送日報到 invoice_server（讓 LegacyAdmin 可即時讀到）
            fetch('http://127.0.0.1:8765/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(legacyData)
            }).catch(function(){});

            // 同步推送財務分錄到 invoice_server（讓 finance.html 可即時讀到）
            fetch('http://127.0.0.1:8765/finance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(financeTransactions)
            }).catch(function(){});

        } catch (err) {
            console.error("[Sync Failed]", err);
        }
    }
};

// API 服務
const apiService = {
    async init() {
        const menu = await idb.get(STORES.MENU, 'current');
        if (!menu) {
            await idb.set(STORES.MENU, 'current', MENU_DATA);
            await idb.set(STORES.ADDONS, 'current', ADDONS);
            await idb.set(STORES.OPTIONS, 'current', DEFAULT_OPTIONS);
            await idb.set(STORES.META, 'group_meta', DEFAULT_GROUP_META);
            triggerSyncPulse('init');
        }
    },

    async getRawConfig() {
        await this.init();
        const [menu, addons, options, groupMeta, settings] = await Promise.all([
            idb.get(STORES.MENU, 'current'),
            idb.get(STORES.ADDONS, 'current'),
            idb.get(STORES.OPTIONS, 'current'),
            idb.get(STORES.META, 'group_meta'),
            idb.get(STORES.SETTINGS, 'current')
        ]);
        return { menu, addons, options, groupMeta, settings };
    },

    async getMenuAndAddons(language = 'zh') {
        const raw = await this.getRawConfig();
        const localizedMenu = (raw.menu || []).map(cat => ({
            ...cat,
            title: parseBilingual(cat.title, language),
            description: parseBilingual(cat.description, language),
            items: (cat.items || []).map(item => ({
                ...item,
                name: parseBilingual(item.name, language),
                description: parseBilingual(item.description, language),
                hoverDescription: parseBilingual(item.hoverDescription, language)
            }))
        }));
        return { ...raw, menu: localizedMenu };
    },

    async getSettings() { 
        return await idb.get(STORES.SETTINGS, 'current'); 
    },

    async saveSettings(s) {
        const cur = await this.getSettings() || {};
        // 深層合併 kiosk_config，避免子物件被整個覆蓋
        let merged = { ...cur, ...s };
        if (s.kiosk_config && cur.kiosk_config) {
            const ck = cur.kiosk_config;
            const sk = s.kiosk_config;
            merged.kiosk_config = {
                ...ck,
                ...sk,
                featureToggles: { ...(ck.featureToggles || {}), ...(sk.featureToggles || {}) },
                content: { ...(ck.content || {}), ...(sk.content || {}) },
                visualSettings: { ...(ck.visualSettings || {}), ...(sk.visualSettings || {}) },
                layoutConfig: { ...(ck.layoutConfig || {}), ...(sk.layoutConfig || {}) }
            };
        }
        await idb.set(STORES.SETTINGS, 'current', merged);
        triggerSyncPulse('saveSettings');
    },

    async saveMenuConfig(menu, addons, options, meta) {
        await idb.set(STORES.MENU, 'current', menu);
        await idb.set(STORES.ADDONS, 'current', addons);
        await idb.set(STORES.OPTIONS, 'current', options);
        if (meta) await idb.set(STORES.META, 'group_meta', meta);
        triggerSyncPulse('saveMenuConfig');
        return true;
    },

    async submitOrder(orderData) {
        // ★ 修正：優先使用 orderData.id（由呼叫方產生），避免雙重 id 問題
        // 儲存 key 與 order.id 必須一致
        const id = orderData.id || `ORD-${Date.now()}`;
        const order = {
            createdAt: new Date().toISOString(),
            status: '待確認',
            ...orderData,  // orderData 展開（含已有的 id）
            id              // 確保最終 id 與儲存 key 相同
        };
        await idb.set(STORES.ORDERS, id, order);
        SharedDataService.syncOrderToLegacy(order);
        triggerSyncPulse('submitOrder');
        return { success: true, order };
    },

    async getAllOrders() { 
        return await idb.getAll(STORES.ORDERS); 
    },

    async updateOrderStatus(id, status) {
        const o = await idb.get(STORES.ORDERS, id);
        if (!o) { 
            console.warn(`[updateOrderStatus] 找不到訂單 id: ${id}`);
            return false;
        }
        o.status = status; 
        await idb.set(STORES.ORDERS, id, o); 
        triggerSyncPulse('updateOrderStatus');
        return true;
    },

    async getSalesStatistics() {
        const all = await this.getAllOrders();
        const valid = all.filter(o => o.status !== '取消' && o.status !== '已取消' && o.status !== 'cancelled');
        const itemMap = {};
        valid.forEach(o => (o.items || []).forEach(it => {
            if (!it || !it.item) return;
            const id = it.item.id || it.item.name;
            if(!itemMap[id]) itemMap[id] = { name: it.item.name, q: 0, r: 0 };
            itemMap[id].q += (it.quantity || 1);
            itemMap[id].r += (it.totalPrice || 0);
        }));
        return {
            // ★ C-02 修正：totalRevenue 改用稅前金額
            totalRevenue: valid.reduce((s,o) => s + (o.subtotal !== undefined ? o.subtotal : Math.round((o.totalPrice || 0) / 1.05)), 0),
            orderCount: valid.length,
            popularItems: Object.entries(itemMap).map(([id, s]) => ({id, name: s.name, quantity: s.q, revenue: s.r})).sort((a,b) => b.revenue - a.revenue),
            salesTrend: [],
            sauceRankings: [],
            addonRankings: []
        };
    },

    async saveSnapshot(snap) {
        const size = (JSON.stringify(snap.data).length * 2 / (1024 * 1024)).toFixed(2) + 'MB';
        await idb.set(STORES.SNAPSHOTS, snap.id, { ...snap, size });
        triggerSyncPulse('saveSnapshot');
    },

    async getAllSnapshots() { 
        return await idb.getAll(STORES.SNAPSHOTS); 
    },

    async deleteSnapshot(id) { 
        await idb.delete(STORES.SNAPSHOTS, id); 
        triggerSyncPulse('deleteSnapshot'); 
    },

    async clearAllSnapshots() { 
        await idb.clearStore(STORES.SNAPSHOTS); 
        triggerSyncPulse('clearAllSnapshots'); 
    },

    async resetToFactory(defaultData, defaultConfig) {
        await idb.clearAll();
        await Promise.all([
            idb.set(STORES.MENU, 'current', defaultData.menu),
            idb.set(STORES.ADDONS, 'current', defaultData.addons),
            idb.set(STORES.OPTIONS, 'current', defaultData.options),
            idb.set(STORES.SETTINGS, 'current', { kiosk_config: defaultConfig })
        ]);
        window.location.reload();
    }
};

const AutoCleaner = {
    preLaunchCleanup: async () => {
        sessionStorage.clear();
        localStorage.removeItem('steakhouse_cart_cache');
        triggerSyncPulse('cleanup');
    },
    emergencyClean: async () => {
        localStorage.clear();
        indexedDB.deleteDatabase(DB_NAME);
        window.location.reload();
    }
};
