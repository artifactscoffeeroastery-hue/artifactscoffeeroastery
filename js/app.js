document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let cart = JSON.parse(localStorage.getItem('coffee_cart')) || [];
    let currentUser = JSON.parse(localStorage.getItem('coffee_user')) || null;

    // --- DOM ELEMENTS ---
    const cartDrawer = document.getElementById('cartDrawer');
    const cartList = document.getElementById('cart-list');
    const totalPriceEl = document.getElementById('total-price');
    const stepAccount = document.getElementById('step-account');
    const stepShipping = document.getElementById('step-shipping');
    const tcgShipping = document.getElementById('tcg-shipping');
    
    // --- INITIALIZATION ---
    setupScrollReveal();
    renderCart(); // Render on load to sync UI with localStorage
    if (currentUser) console.log("Welcome back, " + currentUser.name);

    // --- EVENT DELEGATION ---
    document.body.addEventListener('click', (e) => {
        
        // 1. Navigation / Mobile Menu
        if (e.target.closest('#scroll-top')) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.target.closest('#navHam')) toggleMob();
        if (e.target.classList.contains('mob-link') || e.target.classList.contains('mob-wa')) closeMob();

        // 2. Product Size Selection
        if (e.target.classList.contains('sz-select')) {
            handleSizeSelection(e.target);
        }

        // 3. Add to Cart
        if (e.target.classList.contains('add-to-cart')) {
            addToCart(e.target.dataset.name, e.target.dataset.id);
        }

        // 4. Cart Controls
        if (e.target.classList.contains('qty-minus')) changeQty(e.target.dataset.index, -1);
        if (e.target.classList.contains('qty-plus')) changeQty(e.target.dataset.index, 1);
        if (e.target.id === 'closeCartBtn') closeCart();

        // 5. Auth Flow Toggles
        if (e.target.classList.contains('auth-btn')) {
            toggleAuthUI(e.target);
        }

        // 6. Action Buttons
        if (e.target.id === 'auth-action-btn') handleAuthAction(e.target);
        
        // 7. FAQ Toggles
        if (e.target.closest('.faq-toggle')) {
            toggleFaq(e.target.closest('.faq-item'));
        }
    });

    // Handle Escape key to close drawers
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            closeMob();
        }
    });

    if (tcgShipping) {
        tcgShipping.addEventListener('change', calcTotal);
    }

    // --- CORE LOGIC FUNCTIONS ---

    function handleSizeSelection(btn) {
        const group = btn.closest('.sz-toggle');
        const activeClass = btn.dataset.activeClass;
        group.querySelectorAll('.sz-btn').forEach(b => b.classList.remove(activeClass));
        btn.classList.add(activeClass);
        
        const priceDisplay = document.getElementById(btn.dataset.id + '-p');
        if (priceDisplay) priceDisplay.textContent = btn.dataset.price;
    }

    function addToCart(baseName, productId) {
        const priceEl = document.getElementById(productId + '-p');
        // Improved cleaning to avoid NaN: removes 'R' and spaces
        const cleanPrice = priceEl ? parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) : 0;
        
        const existingItem = cart.find(item => item.name === baseName && item.price === cleanPrice);

        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ name: baseName, price: cleanPrice, qty: 1 });
        }
        
        saveCart();
        renderCart();
        
        if (!currentUser) showAccountStep(); 
        else showShippingStep();
    }

    function renderCart() {
        if (!cartList) return;

        if (cart.length === 0) {
            cartList.innerHTML = '<div style="text-align:center; padding:30px; color:#666;">Your selection is empty</div>';
            calcTotal();
            return;
        }

        cartList.innerHTML = cart.map((item, index) => `
            <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #333;">
                <div style="flex: 1;">
                    <div style="font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: white; letter-spacing: 1px;">${item.name}</div>
                    <div style="color: #00ffff; font-size: 13px; font-family: monospace;">R ${item.price.toFixed(2)} each</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-right: 15px;">
                    <button class="qty-minus" data-index="${index}" style="background:none; border: 1px solid #444; color:white; cursor:pointer; width:25px; height:25px;">-</button>
                    <span style="font-family: monospace; color:white; min-width: 15px; text-align:center;">${item.qty}</span>
                    <button class="qty-plus" data-index="${index}" style="background:none; border: 1px solid #444; color:white; cursor:pointer; width:25px; height:25px;">+</button>
                </div>
                <div style="font-family: monospace; color: white; min-width: 80px; text-align: right;">R ${(item.price * item.qty).toFixed(2)}</div>
            </div>
        `).join('');

        calcTotal(); 
    }

    function changeQty(indexStr, delta) {
        const index = parseInt(indexStr);
        if (cart[index]) {
            cart[index].qty += delta;
            if (cart[index].qty <= 0) cart.splice(index, 1);
            saveCart();
            renderCart();
        }
    }

    function calcTotal() {
        if (!totalPriceEl) return;
        const shippingCost = tcgShipping ? parseFloat(tcgShipping.value) : 0;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const total = subtotal + shippingCost;
        
        totalPriceEl.textContent = "Total: R " + total.toFixed(2);
        updatePayFastFields(total, cart);
    }

    function updatePayFastFields(total, cartItems) {
        const pfAmount = document.getElementById('pf_amount');
        const pfDesc = document.getElementById('pf_item_desc');
        const pfName = document.getElementById('pf_name');
        const pfEmail = document.getElementById('pf_email');

        if (pfAmount) pfAmount.value = total.toFixed(2);
        if (pfDesc) {
            pfDesc.value = cartItems.map(i => `${i.qty}x ${i.name}`).join(', ');
        }
        if (currentUser) {
            if (pfName) pfName.value = currentUser.name;
            if (pfEmail) pfEmail.value = currentUser.email;
        }
    }

    function saveCart() {
        localStorage.setItem('coffee_cart', JSON.stringify(cart));
    }

    // --- UI VIEW TOGGLING ---

    function showAccountStep() {
        cartDrawer.classList.add('active');
        stepAccount.style.display = 'block';
        stepShipping.style.display = 'none';
    }

    function showShippingStep() {
        cartDrawer.classList.add('active');
        stepAccount.style.display = 'none';
        stepShipping.style.display = 'block';
    }

    function closeCart() {
        cartDrawer.classList.remove('active');
    }

    // --- AUTHENTICATION ---

    function toggleAuthUI(btn) {
        const type = btn.dataset.auth;
        const container = document.getElementById('form-auth-container');
        const actionBtn = document.getElementById('auth-action-btn');
        document.querySelectorAll('.auth-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (type === 'signin') {
            container.innerHTML = '<input type="email" id="signin-email" placeholder="Email Address">';
            actionBtn.dataset.action = 'signIn';
            actionBtn.textContent = 'Sign In';
        } else {
            container.innerHTML = `
                <input type="text" id="reg-name" placeholder="First Name">
                <input type="email" id="reg-email" placeholder="Email Address">
            `;
            actionBtn.dataset.action = 'saveUser';
            actionBtn.textContent = 'Continue to Delivery';
        }
    }

    function handleAuthAction(btn) {
        const email = document.getElementById(btn.dataset.action === 'signIn' ? 'signin-email' : 'reg-email')?.value;
        if (!email) return alert("Enter email");

        if (btn.dataset.action === 'signIn') {
            const storedUser = JSON.parse(localStorage.getItem('user_' + email));
            if (storedUser) {
                currentUser = storedUser;
            } else {
                return alert("Account not found. Please register.");
            }
        } else {
            const name = document.getElementById('reg-name')?.value;
            if (!name) return alert("Enter your name");
            currentUser = { name, email };
            localStorage.setItem('user_' + email, JSON.stringify(currentUser));
        }

        localStorage.setItem('coffee_user', JSON.stringify(currentUser));
        showShippingStep();
    }

    // --- UTILS & REVEAL ---

    function toggleMob() {
        const overlay = document.getElementById('mobOverlay');
        const ham = document.getElementById('navHam');
        const isOpen = overlay.classList.toggle('active');
        ham.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function closeMob() {
        document.getElementById('mobOverlay').classList.remove('active');
        document.getElementById('navHam').classList.remove('open');
        document.body.style.overflow = '';
    }

    function toggleFaq(item) {
        const ans = item.querySelector('.faq-ans');
        const isOpen = item.classList.toggle('open');
        
        document.querySelectorAll('.faq-item.open').forEach(i => {
            if (i !== item) {
                i.classList.remove('open');
                i.querySelector('.faq-ans').style.maxHeight = '0';
            }
        });
        ans.style.maxHeight = isOpen ? ans.scrollHeight + 'px' : '0';
    }

    function setupScrollReveal() {
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { 
                if (e.isIntersecting) { 
                    e.target.classList.add('in'); 
                    io.unobserve(e.target); 
                } 
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(r => io.observe(r));
    }
});