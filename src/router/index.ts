import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '../stores/auth'

// Lazy load views
const LoginView = () => import('../views/auth/LoginView.vue')
const ForgotPasswordView = () => import('../views/auth/ForgotPasswordView.vue')
const DashboardLayout = () => import('../layout/DashboardLayout.vue')
const DashboardView = () => import('../views/dashboard/DashboardView.vue')
const DailySalesView = () => import('../views/operations/DailySalesView.vue')
const AccountsView = () => import('../views/accounts/AccountsView.vue')
const CreateAccountView = () => import('../views/accounts/CreateAccountView.vue')
const ScanInvoiceView = () => import('../views/operations/ScanInvoiceView.vue')
const CreateInvoiceView = () => import('../views/invoices/CreateInvoiceView.vue')
const InvoicesListView = () => import('../views/invoices/InvoicesListView.vue')

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/forgot-password',
            name: 'forgot-password',
            component: ForgotPasswordView
        },
        {
            path: '/',
            component: DashboardLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: DashboardView
                },
                { path: 'sales', name: 'sales', component: DailySalesView },
                { path: 'accounts', name: 'accounts', component: AccountsView },
                { path: 'accounts/new', name: 'create-account', component: CreateAccountView },
                { path: 'scan', name: 'scan', component: ScanInvoiceView },
                { path: 'invoices', name: 'invoices', component: InvoicesListView },
                { path: 'invoices/new', name: 'create-invoice', component: CreateInvoiceView },
                { path: 'payments', name: 'payments', component: () => import('../views/payments/PaymentsView.vue') },
                { path: 'payments/new', name: 'create-payment', component: () => import('../views/payments/CreatePaymentView.vue') },
                { path: 'fuel', name: 'fuel', component: () => import('../views/operations/FuelInventoryView.vue') },
                { path: 'lottery', name: 'lottery', component: () => import('../views/operations/LotteryReconciliationView.vue') }
            ]
        }
    ]
})

// Navigation Guard
router.beforeEach(async (to, _from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const authStore = useAuthStore()

    // Wait for Firebase Auth to initialize (if not already handled by store)
    // We can just rely on the store state if it's already set (e.g. demo mode)
    if (!authStore.user && !authStore.loading) {
        // If store says no user, maybe firebase is still loading? 
        // For demo simplicity, we'll let the view mount and store handle it, 
        // but here we just check if we need to block.
    }

    // To be safe, wait for a tick or check store
    // Better approach: Check if store has user. If not, wait for Firebase.

    if (requiresAuth) {
        if (authStore.user) {
            next();
        } else {
            // Fallback to waiting for firebase if store is empty (initial load)
            const currentUser = await new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe()
                    resolve(user)
                })
            })
            if (currentUser) {
                next()
            } else {
                next('/login')
            }
        }
    } else if ((to.path === '/login' || to.path === '/forgot-password') && authStore.user) {
        next('/')
    } else {
        next()
    }
})

export default router
