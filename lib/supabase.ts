import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://ytgmmizkdmjrxasleymh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Z21taXprZG1qcnhhc2xleW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDkwNjYsImV4cCI6MjA4MzE4NTA2Nn0.xhQ6Xqe_S2ldtz82T8HPhPC4LvPWVmJ8Y8X1f3H_wrU';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Database types
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    auth_user_id: string | null;
                    salesman_id: string;
                    salesman_name: string;
                    email: string | null;
                    phone: string | null;
                    pin: string | null;
                    role: 'salesman' | 'admin' | 'delivery';
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                    assigned_booker_ids: string[] | null;
                };
                Insert: {
                    id?: string;
                    auth_user_id?: string | null;
                    salesman_id: string;
                    salesman_name: string;
                    email?: string | null;
                    phone?: string | null;
                    pin?: string | null;
                    role?: 'salesman' | 'admin' | 'delivery';
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    assigned_booker_ids?: string[] | null;
                };
                Update: {
                    id?: string;
                    auth_user_id?: string | null;
                    salesman_id?: string;
                    salesman_name?: string;
                    email?: string | null;
                    phone?: string | null;
                    pin?: string | null;
                    role?: 'salesman' | 'admin' | 'delivery';
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    assigned_booker_ids?: string[] | null;
                };
            };
            stores: {
                Row: {
                    id: string;
                    name: string;
                    address: string;
                    phone: string | null;
                    latitude: number;
                    longitude: number;
                    is_default: boolean;
                    registered_by: string | null;
                    distribution_id: string;
                    created_at: string;
                    updated_at: string;
                    customer_name: string | null;
                    image_url: string | null;
                    customer_type_id: number | null;
                    area_name: string | null;
                    pop_type: string | null;
                    order_booker_name: string | null;
                    ob_id: number | null;
                    Selesmen_Name: string | null;
                    sm_id: number | null;
                    Week_day_Name: string | null;
                    ob_sheet_seq_no: number | null;
                    GST_Status: string | null;
                    dist_id: number | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    address: string;
                    phone?: string | null;
                    latitude: number;
                    longitude: number;
                    is_default?: boolean;
                    registered_by?: string | null;
                    distribution_id: string;
                    created_at?: string;
                    updated_at?: string;
                    customer_name?: string | null;
                    image_url?: string | null;
                    customer_type_id?: number | null;
                    area_name?: string | null;
                    pop_type?: string | null;
                    order_booker_name?: string | null;
                    ob_id?: number | null;
                    Selesmen_Name?: string | null;
                    sm_id?: number | null;
                    Week_day_Name?: string | null;
                    ob_sheet_seq_no?: number | null;
                    GST_Status?: string | null;
                    dist_id?: number | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    address?: string;
                    phone?: string | null;
                    latitude?: number;
                    longitude?: number;
                    is_default?: boolean;
                    registered_by?: string | null;
                    distribution_id?: string;
                    created_at?: string;
                    updated_at?: string;
                    customer_name?: string | null;
                    image_url?: string | null;
                    customer_type_id?: number | null;
                    area_name?: string | null;
                    pop_type?: string | null;
                    order_booker_name?: string | null;
                    ob_id?: number | null;
                    Selesmen_Name?: string | null;
                    sm_id?: number | null;
                    Week_day_Name?: string | null;
                    ob_sheet_seq_no?: number | null;
                    GST_Status?: string | null;
                    dist_id?: number | null;
                };
            };
            products: {
                Row: {
                    id: string;
                    product_code: string;
                    name: string;
                    category: string;
                    price: number;
                    stock: number;
                    image_url: string | null;
                    is_active: boolean;
                    distribution_id: string;
                    product_id: number | null;
                    dist_id: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    product_code: string;
                    name: string;
                    category: string;
                    price: number;
                    stock?: number;
                    image_url?: string | null;
                    is_active?: boolean;
                    distribution_id: string;
                    product_id?: number | null;
                    dist_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    product_code?: string;
                    name?: string;
                    category?: string;
                    price?: number;
                    stock?: number;
                    image_url?: string | null;
                    is_active?: boolean;
                    distribution_id?: string;
                    product_id?: number | null;
                    dist_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    order_number: string;
                    user_id: string | null;
                    store_id: string | null;
                    store_name: string;
                    store_address: string;
                    total_amount: number;
                    status: string;
                    created_at: string;
                    updated_at: string;
                    submitted_at: string | null;
                    approved_at: string | null;
                    distribution_id: string | null;
                    order_date: string | null;
                    delivery_sm_id: string | null;
                    delivery_status: 'pending' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned' | null;
                    delivered_at: string | null;
                    collected_amount: number | null;
                    payment_method: 'cash' | 'credit' | 'online' | null;
                    delivery_notes: string | null;
                };
                Insert: {
                    id?: string;
                    order_number: string;
                    user_id?: string | null;
                    store_id?: string | null;
                    store_name: string;
                    store_address: string;
                    total_amount: number;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                    submitted_at?: string | null;
                    approved_at?: string | null;
                    distribution_id?: string | null;
                    order_date?: string | null;
                    delivery_sm_id?: string | null;
                    delivery_status?: 'pending' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned' | null;
                    delivered_at?: string | null;
                    collected_amount?: number | null;
                    payment_method?: 'cash' | 'credit' | 'online' | null;
                    delivery_notes?: string | null;
                };
                Update: {
                    id?: string;
                    order_number?: string;
                    user_id?: string | null;
                    store_id?: string | null;
                    store_name?: string;
                    store_address?: string;
                    total_amount?: number;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                    submitted_at?: string | null;
                    approved_at?: string | null;
                    distribution_id?: string | null;
                    order_date?: string | null;
                    delivery_sm_id?: string | null;
                    delivery_status?: 'pending' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned' | null;
                    delivered_at?: string | null;
                    collected_amount?: number | null;
                    payment_method?: 'cash' | 'credit' | 'online' | null;
                    delivery_notes?: string | null;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string | null;
                    product_code: string;
                    product_name: string;
                    price: number;
                    quantity: number;
                    line_total: number;
                    created_at: string;
                    distribution_id: string | null;
                    delivered_quantity: number | null;
                    returned_quantity: number | null;
                    return_reason: string | null;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id?: string | null;
                    product_code: string;
                    product_name: string;
                    price: number;
                    quantity: number;
                    line_total: number;
                    created_at?: string;
                    distribution_id?: string | null;
                    delivered_quantity?: number | null;
                    returned_quantity?: number | null;
                    return_reason?: string | null;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string | null;
                    product_code?: string;
                    product_name?: string;
                    price?: number;
                    quantity?: number;
                    line_total?: number;
                    created_at?: string;
                    distribution_id?: string | null;
                    delivered_quantity?: number | null;
                    returned_quantity?: number | null;
                    return_reason?: string | null;
                };
            };
            distributions: {
                Row: {
                    id: string;
                    name: string;
                    code: string;
                    description: string | null;
                    is_active: boolean;
                    dist_id: number | null;
                    client_name: string | null;
                    client_code: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    code: string;
                    description?: string | null;
                    is_active?: boolean;
                    dist_id?: number | null;
                    client_name?: string | null;
                    client_code?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    code?: string;
                    description?: string | null;
                    is_active?: boolean;
                    dist_id?: number | null;
                    client_name?: string | null;
                    client_code?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_distributions: {
                Row: {
                    id: string;
                    user_id: string;
                    distribution_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    distribution_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    distribution_id?: string;
                    created_at?: string;
                };
            };
        };
    };
}

// Distribution interfaces
export interface Distribution {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    distId?: number;
    clientName?: string;
    clientCode?: string;
}

export interface UserDistribution {
    id: string;
    userId: string;
    distributionId: string;
    distribution?: Distribution;
}

// Delivery-specific types
export type DeliveryStatus = 'pending' | 'out_for_delivery' | 'delivered' | 'partial' | 'failed' | 'returned';
export type PaymentMethod = 'cash' | 'credit' | 'online';

export interface DeliveryOrderItem {
    id: string;
    productId: string | null;
    productCode: string;
    productName: string;
    price: number;
    quantity: number;
    lineTotal: number;
    deliveredQuantity: number;
    returnedQuantity: number;
    returnReason: string | null;
}

export interface DeliveryOrder {
    id: string;
    orderNumber: string;
    storeId: string | null;
    storeName: string;
    storeAddress: string;
    storePhone: string | null;
    storeLatitude: number | null;
    storeLongitude: number | null;
    totalAmount: number;
    status: string;
    distributionId: string | null;
    distributionName: string | null;
    orderDate: string;
    createdAt: string;
    bookerName: string | null;
    bookerId: string | null;
    bookerSalesmanId: string | null;
    deliveryStatus: DeliveryStatus;
    deliverySmId: string | null;
    deliveredAt: string | null;
    collectedAmount: number | null;
    paymentMethod: PaymentMethod | null;
    deliveryNotes: string | null;
    items: DeliveryOrderItem[];
    itemsCount: number;
}
