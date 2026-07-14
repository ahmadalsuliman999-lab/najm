const sheetUrl = "https://docs.google.com/spreadsheets/d/1sn1BGB0WKWlM8hDnzPuB4CNV1RwV4NlBowYtoEG53Ws/gviz/tq?tqx=out:json";
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbwWN9zs2cYovMue5rn2U0KShPxXS4unHyu4XNC3tbHw-Xl4ZXtuonixuvKp_CwDoorA/exec"; 

const mainCategories = ["الكل", "عرض", "دخان", "مواد غذائية", "مشروبات", "منظفات"];
let currentCategory = "الكل";
let productsList = [];

// استهداف عناصر الواجهة من الـ HTML
const tabsContainer = document.getElementById('tabsContainer');
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');

// استهداف عناصر واجهة تسجيل الاسم
const loginOverlay = document.getElementById('loginOverlay');
const mainAppContainer = document.getElementById('mainAppContainer');
const usernameInput = document.getElementById('usernameInput');
const enterStoreBtn = document.getElementById('enterStoreBtn');

// مؤقت ذكي لمنع تكرار الإرسال أثناء الكتابة المستمرة
let searchTimeout;

// 💡 منطق فحص الأمان: إذا كان الاسم محفوظاً سابقاً في ذاكرة المتصفح، ندخل للمتجر فوراً
const savedName = localStorage.getItem('shop_username');
if (savedName && savedName.trim() !== "") {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (mainAppContainer) mainAppContainer.style.display = 'block';
}

// عند الضغط على زر "دخول المتجر"
if (enterStoreBtn) {
    enterStoreBtn.addEventListener('click', () => {
        const nameValue = usernameInput.value.trim();
        
        if (nameValue === "") {
            alert("يرجى كتابة الاسم أولاً لتتمكن من تصفح المتجر!");
            return;
        }
        
        // حفظ الاسم محلياً في ذاكرة المتصفح
        localStorage.setItem('shop_username', nameValue);
        
        // إخفاء شاشة تسجيل الاسم وإظهار المتجر مباشرة
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (mainAppContainer) mainAppContainer.style.display = 'block';
    });
}

async function fetchSheetData() {
    try {
        noResults.style.display = 'block';
        noResults.innerHTML = "<h3>جاري جلب البيانات...</h3>";
        
        const response = await fetch(sheetUrl);
        const text = await response.text();
        const jsonData = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));
        
        const cols = jsonData.table.cols.map(col => col.label ? col.label.trim() : '');
        const rows = jsonData.table.rows;
        
        const nameIdx = cols.indexOf("الاسم");
        const priceIdx = cols.indexOf("السعر");
        const descIdx = cols.indexOf("الوصف");
        const catIdx = cols.indexOf("القسم");
        const imgIdx = cols.indexOf("الصورة");

        productsList = rows.map(row => {
            const cells = row.c;
            const imgValue = cells[imgIdx] && cells[imgIdx].v !== null ? cells[imgIdx].v : 'default';
            
            return {
                name: cells[nameIdx] && cells[nameIdx].v !== null ? cells[nameIdx].v : '',      
                price: cells[priceIdx] && cells[priceIdx].v !== null ? cells[priceIdx].v : '',     
                desc: cells[descIdx] && cells[descIdx].v !== null ? cells[descIdx].v : '',      
                category: cells[catIdx] && cells[catIdx].v !== null ? cells[catIdx].v : '',  
                // 🎯 تعديل: قراءة مسار الصورة من الجذر مباشرة (بدون مجلد images)
                img: `${imgValue}.png` 
            };
        });
        
        noResults.style.display = 'none';
        filterAndRender();
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        noResults.innerHTML = "<h3>حدث خطأ أثناء تحميل البيانات.</h3>";
    }
}

function openImage(src) {
    document.getElementById('enlargedImage').src = src;
    document.getElementById('imageModal').style.display = 'flex';
}

function closeImage() {
    document.getElementById('imageModal').style.display = 'none';
}

function filterAndRender(filterText = '') {
    productsGrid.innerHTML = '';
    let hasProducts = false;

    productsList.forEach(product => {
        const matchCategory = (currentCategory === "الكل" || product.category === currentCategory);
        const matchSearch = String(product.name).toLowerCase().includes(filterText.toLowerCase());

        if (matchCategory && matchSearch && product.name !== '') {
            hasProducts = true;
            const card = document.createElement('div');
            
            const isPromo = product.category === "عرض";
            card.className = isPromo ? 'product-card is-promo' : 'product-card';
            
            card.innerHTML = `
                <div class="product-image-wrapper" onclick="openImage('${product.img}')" style="cursor: pointer;">
                    ${isPromo ? '<span class="promo-badge">🔥 عرض خاص لفترة محدودة</span>' : ''}
                    <img src="${product.img}" onerror="this.src='default.png'" alt="${product.name}" class="product-image" loading="lazy">
                </div>
                <div class="product-details">
                    <div class="product-info-top">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="${isPromo ? 'promo-desc' : 'product-desc'}">${product.desc || ''}</p>
                    </div>
                    <div class="product-price-tag">${product.price}</div>
                </div>
            `;
            productsGrid.appendChild(card);
        }
    });

    noResults.style.display = hasProducts ? 'none' : 'block';
    if(!hasProducts) {
        noResults.innerHTML = "<h3>لا توجد مواد حالياً</h3>";
    }
}

function renderTabs() {
    tabsContainer.innerHTML = '';
    mainCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = `tab ${category === currentCategory ? 'active' : ''}`;
        button.innerText = category;
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            button.classList.add('active');
            currentCategory = category;
            searchInput.value = ''; 
            filterAndRender();
        });
        tabsContainer.appendChild(button);
    });
}

// ⚠️ إرسال كلمات البحث، اسم المستخدم المسجل، ونوع جهازه لجوجل شيت تلقائياً
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    filterAndRender(query); // فلترة فورية أمام العميل

    // إلغاء المؤقت السابق عند استمرار الكتابة لمنع التكرار
    clearTimeout(searchTimeout);

    if (query.length >= 2) {
        // الانتظار لمدة ثانيتين بعد التوقف عن الكتابة للإرسال دفعة واحدة
        searchTimeout = setTimeout(() => {
            const userAgentInfo = navigator.userAgent;
            const currentName = localStorage.getItem('shop_username') || "زائر مجهول";

            fetch(appsScriptUrl, {
                method: 'POST',
                mode: 'no-cors', // لتجاوز قيود الـ CORS بالمتصفحات
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    search_term: query,
                    user_name: currentName,
                    user_agent: userAgentInfo 
                })
            })
            .then(() => console.log("تم تسجيل البحث بنجاح للحساب:", currentName))
            .catch(err => console.error("فشل إرسال البيانات:", err));
        }, 2000);
    }
});

renderTabs();
fetchSheetData();
