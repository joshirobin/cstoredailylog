import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '../stores/auth'

// Lazy load views
const LoginView = () => import('../views/auth/LoginView.vue')
const SignUpView = () => import('../views/auth/SignUpView.vue')
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
            path: '/signup',
            name: 'signup',
            component: SignUpView
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
                { path: 'fuel', name: 'fuel', component: () => import('../views/operations/FuelOperationsView.vue') },

                // Lottery Management
                { path: 'lottery', name: 'lottery', component: () => import('../views/lottery/LotteryDashboard.vue') },
                { path: 'lottery/inventory', name: 'lottery-inventory', component: () => import('../views/lottery/LotteryInventoryView.vue') },
                { path: 'lottery/reconciliation', name: 'lottery-reconciliation', component: () => import('../views/lottery/DailyReconciliationView.vue') },
                { path: 'lottery/settlement', name: 'lottery-settlement', component: () => import('../views/lottery/LotterySettlementView.vue') },

                // Employee Management & Operations
                { path: 'employees', name: 'employees', component: () => import('../views/employees/EmployeesView.vue') },
                { path: 'shifts', name: 'shifts', component: () => import('../views/shifts/ShiftScheduleView.vue') },
                { path: 'time-clock', name: 'time-clock', component: () => import('../views/employees/TimeClockView.vue') },
                { path: 'tasks', name: 'tasks', component: () => import('../views/employees/TasksView.vue') },
                { path: 'checklists', name: 'checklists', component: () => import('../views/employees/DailyChecklistsView.vue') },
                { path: 'inventory', name: 'inventory', component: () => import('../views/inventory/InventoryView.vue') },
                { path: 'vault', name: 'vault', component: () => import('../views/vault/DocumentVaultView.vue') },
                { path: 'pricebook', name: 'pricebook', component: () => import('../views/pricebook/PriceBookView.vue') },
                { path: 'purchases', name: 'purchases', component: () => import('../views/purchases/PurchasesView.vue') },
                { path: 'clerk', name: 'clerk', component: () => import('../views/operations/ClerkDashboardView.vue') },
                { path: 'journal', name: 'journal', component: () => import('../views/operations/OperationsJournalView.vue') },
                { path: 'vendor-checkin', name: 'vendor-checkin', component: () => import('../views/operations/VendorCheckinView.vue') },
                { path: 'food-safety', name: 'food-safety', component: () => import('../views/operations/TemperatureLogView.vue') },
                { path: 'competitor-watch', name: 'competitor-watch', component: () => import('../views/operations/CompetitorWatchView.vue') },
                { path: 'lottery-shrinkage', name: 'lottery-shrinkage', component: () => import('../views/lottery/LotteryShrinkageView.vue') },
                { path: 'cash-flow', name: 'cash-flow', component: () => import('../views/operations/CashFlowPredictorView.vue') },
                { path: 'food-waste', name: 'food-waste', component: () => import('../views/operations/FoodWasteView.vue') },
                { path: 'sops', name: 'sops', component: () => import('../views/employees/EmployeeSOPView.vue') },
                { path: 'settings', name: 'settings', component: () => import('../views/settings/StoreSettingsView.vue') },
                { path: 'access-control', name: 'access-control', component: () => import('../views/admin/AccessControlView.vue') }
            ]
        }
    ]
})

// Navigation Guard
router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    // Wait for auth to initialize (both Firebase and our custom loading state)
    const getCurrentUser = () => {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe()
                resolve(user)
            })
        })
    }

    if (!authStore.user && !authStore.isDemo) {
        await getCurrentUser()
    }

    // Wait for our custom loading state which includes role fetching
    if (authStore.loading) {
        // Simple poll/wait for loading to finish
        let attempts = 0
        while (authStore.loading && attempts < 50) {
            await new Promise(r => setTimeout(r, 100))
            attempts++
        }
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

    if (requiresAuth) {
        if (authStore.user || authStore.isDemo) {
            // Check permissions
            const canVisit = authStore.canVisit(to.name as string)

            if (!canVisit) {
                if (to.name === 'dashboard') {
                    // If even dashboard isn't allowed (weird), go to login
                    console.warn('Access denied to dashboard, redirecting to login');
                    next('/login')
                } else {
                    // Redirect to dashboard instead of looping
                    next('/')
                }
            } else {
                next()
            }
        } else {
            next('/login')
        }
    } else {
        // Logged in user trying to access login/signup
        if ((to.path === '/login' || to.path === '/signup' || to.path === '/forgot-password') && (authStore.user || authStore.isDemo)) {
            next('/')
        } else {
            next()
        }
    }
})

export default router
