import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// --- Centralized Axios Client ---
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // Disabled by default to fix CORS. Re-enable specifically for endpoints that support credentials/cookies.
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add a request interceptor to attach the token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log responses and errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface Child {
  id?: number;
  child_dob: string;
}

export interface Slot {
  id: number;
  parent_schedule_id: number;
  start_time: string;
  end_time: string;
}

export interface Schedule {
  id: number;
  user_id: number;
  parent_request_id: number;
  schedule_date: string;
  slots: Slot[];
}

export interface Choice {
  id: number;
  user_id: number;
  parent_request_id: number;
  choice_order: number;
  interview_date: string;
  interview_time: string;
  babysitter_first_name: string;
  babysitter_last_name: string;
  babysitter_email: string;
  babysitter_phone: string;
  babysitter_address: string;
  zoom_meeting_link?: string;
  final_choice?: number;
  bb_bs_id?: number | null;
  babysitter_pic?: string;
}

export interface ParentRequest {
  id: number;
  user_id: number;
  parent_address: string;
  quote_status: number;
  board_status: string;
  board_order: number;
  user: User;
  children: Child[];
  hourly_rate?: string;
  schedules?: Schedule[];
  choices?: Choice[];
  contract?: Contract;
  created_at?: string;
  updated_at?: string;
  bb_bs_id?: string | number;
}

export interface Invoice {
  billable_hours: any;
  id: number;
  invoice_num: string;
  receipt_num: string | null;
  user_id: number;
  parent_request_id: number;
  amount: string;
  paid_amount: string;
  payment_status: string;
  payment_method: string;
  stripe_payment_intent: string | null;
  due_date: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  };
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_phone: string;
  user_address: string;
  user_role: number;
  stripe_customer_id?: string;
  default_payment_method?: string;
  cmg_num?: string;
  user_language?: 'en' | 'fr';
  children?: Child[];
  parent_requests?: ParentRequest[];
  invoices?: Invoice[];
  cards?: {
    data: PaymentMethod[];
  };
}

export interface Contract {
  id: number;
  user_id: number;
  choice_id: number;
  parent_request_id: number;
  status: number;
  response_date: string | null;
  start_date: string;
  end_date: string;
  hourly_rate: string;
  created_at: string;
  updated_at: string;
  user: User;
  request: ParentRequest;
}

export interface Attestation {
  id: number;
  user_id: number;
  year: string;
  file: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface AttestationsResponse {
  data: Attestation[];
}


export interface RegisterResponse {
  status: boolean;
  message: string;
  data?: {
    user: User;
    parent_request: {
      id: number;
      user_id: number;
      parent_address: string;
      children: Child[];
    };
    token: string | null;
    password?: string | null;
  };
  errors?: Record<string, string[]>;
  code?: number;
}

export interface ParentRequestResponse {
  status: boolean;
  message: string;
  data?: ParentRequest;
  errors?: Record<string, string[]>;
  code?: number;
}

export interface UserResponse {
  status: boolean;
  data?: User;
  cards?: {
    data: PaymentMethod[];
  };
  message?: string;
}

export interface LogoutResponse {
  status: boolean;
  message: string;
}

export interface ContractResponse {
  status: boolean | number;
  contract_id: number;
  hourly_rate: string;
  user: User;
  start_date: string;
  end_date: string;
  format1: Record<string, Record<string, string[]>>;
  format2: Record<string, number>;
}

export interface BabysitterChoicePayload {
  choice_order?: number;
  bb_bs_id?: number | string;
  babysitter_first_name?: string;
  babysitter_last_name?: string;
  babysitter_email?: string;
  babysitter_phone?: string;
  babysitter_address?: string;
  interview_date?: string;
  interview_time?: string;
  final_choice?: number;
  babysitter_pic?: string;
}

export const api = {
  getToken: () => localStorage.getItem("auth_token"),
  setToken: (token: string) => localStorage.setItem("auth_token", token),
  removeToken: () => localStorage.removeItem("auth_token"),

  register: async (
    data: {
      first_name: string;
      last_name: string;
      email: string;
      user_phone: string;
      user_address: string;
      children: { child_dob: string }[];
      board_status?: string;
      lat?: number;
      lng?: number;
    },
    parentRequestId?: number,
  ): Promise<RegisterResponse> => {
    const params = parentRequestId
      ? { parent_request_id: parentRequestId }
      : {};
    const response = await apiClient.post("/auth/register", data, { params });
    return {
      ...response.data,
      code: response.status,
    };
  },

  login: async (data: {
    email: string;
    password?: string;
  }): Promise<RegisterResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  checkEmail: async (
    email: string,
  ): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/auth/check-email", { email });
    return response.data;
  },

  verifyOtp: async (data: {
    email: string;
    otp: string;
  }): Promise<RegisterResponse> => {
    const response = await apiClient.post("/auth/verify-otp", data);
    return response.data;
  },

  getUser: async (): Promise<UserResponse & { code?: number }> => {
    try {
      const response = await apiClient.get("/auth/user");
      return {
        ...response.data,
        code: response.status
      };
    } catch (error: any) {
      return { 
        status: false, 
        message: error.response?.data?.message || "Request failed",
        code: error.response?.status
      };
    }
  },

  logout: async (): Promise<LogoutResponse> => {
    const response = await apiClient.post("/auth/logout");
    if (response.data.status) {
      api.removeToken();
    }
    return response.data;
  },

  updateParentRequest: async (
    id: number,
    data: {
      first_name: string;
      last_name: string;
      user_phone?: string;
      parent_address: string;
      children: { id?: number; child_dob: string }[];
      choices?: BabysitterChoicePayload[];
      hourly_rate?: string | number;
      user_language?: 'en' | 'fr';
      _method?: string;
      lat?: number;
      lng?: number;
      bb_bs_id?: string | number;
    },
  ): Promise<ParentRequestResponse> => {
    const response = await apiClient.post(`/parent-requests/${id}`, {
      ...data,
      _method: "put",
    });
    return {
      ...response.data,
      code: response.status,
    };
  },

  updateBoardStatus: async (data: {
    parent_request_id: number;
    board_status: string;
    board_order: number;
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/update-board-status", data);
    return response.data;
  },

  createParentRequest: async (data: {
    first_name: string;
    last_name: string;
    email: string;
    user_phone: string;
    parent_address: string;
    children: { child_dob: string }[];
    schedules: any[];
    hourly_rate?: string | number;
    user_language?: 'en' | 'fr';
    board_status?: string;
    from_admin?: boolean;
    lat?: number;
    lng?: number;
    choices?: BabysitterChoicePayload[];
    bb_bs_id?: string | number;
  }): Promise<ParentRequestResponse> => {
    const response = await apiClient.post("/parent-requests", data);
    return {
      ...response.data,
      code: response.status,
    };
  },

  getSingleParentRequest: async (id: number): Promise<ParentRequest> => {
    const response = await apiClient.get(`/parent-requests/${id}`);
    return response.data;
  },

  getParentSchedules: async (
    parentRequestId: number,
  ): Promise<{ status: boolean; data: any[] }> => {
    const response = await apiClient.get("/parent-schedules", {
      params: { parent_request_id: parentRequestId },
    });
    return response.data;
  },

  createParentSchedules: async (data: {
    parent_request_id: number;
    schedules: {
      date: string;
      slots: { start_time: string; end_time: string }[];
    }[];
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/parent-schedules", data);
    return response.data;
  },

  updateParentSchedule: async (
    scheduleId: number,
    data: {
      date: string;
      slots: { id?: number; start_time: string; end_time: string }[];
    },
  ): Promise<{ status: boolean; message: string; data?: any }> => {
    const response = await apiClient.put(
      `/parent-schedules/${scheduleId}`,
      data,
    );
    return response.data;
  },

  getParentBabysitterChoices: async (
    parentRequestId: number,
  ): Promise<{ status: boolean; data: any[] }> => {
    const response = await apiClient.get("/parent-babysitter-choices", {
      params: { parent_request_id: parentRequestId },
    });
    return response.data;
  },

  getExternalBabysitters: async (
    page: number = 1,
    filters: Record<string, any> = {},
  ): Promise<any> => {
    const response = await axios.get(
      "https://bloom-buddies.fr/api/all-bs-for-api",
      {
        params: { page, ...filters },
      },
    );
    return response.data;
  },

  createBabysitterChoices: async (data: {
    parent_request_id: number;
    choices: BabysitterChoicePayload[];
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/parent-babysitter-choices", data);
    return response.data;
  },

  // Admin: requests whose price quote is validated and are in the matching stage.
  getMatchingRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/matching-requests");
    return Array.isArray(response.data) ? response.data : [];
  },

  // Admin: requests where a final babysitter was chosen, awaiting contract signature & payment.
  getPendingSignatureRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/pending-signature-requests");
    return Array.isArray(response.data) ? response.data : [];
  },

  // Family has signed; awaiting the babysitter's signature.
  getPendingBabysitterSignatureRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/pending-babysitter-signature-requests");
    return Array.isArray(response.data) ? response.data : [];
  },

  // Completed: babysitter has signed. Each item carries total_hours + total_revenue.
  getCompletedSignedRequests: async (): Promise<any[]> => {
    const response = await apiClient.get("/completed-contract-requests");
    return Array.isArray(response.data) ? response.data : [];
  },

  // Mark the babysitter's contract as generated for a given choice.
  generateBabysitterContract: async (choiceId: number): Promise<any> => {
    const response = await apiClient.post(`/generate-babysitter-contract/${choiceId}`);
    return response.data;
  },

  // Babysitter contract: fetch the auto-generated contract data (public).
  getBabysitterContract: async (choiceId: number): Promise<any> => {
    const response = await apiClient.get(`/babysitter-contract/${choiceId}`);
    return response.data;
  },

  // Babysitter contract: record the babysitter's signature (public).
  signBabysitterContract: async (
    choiceId: number,
    data: { dob: string; ssn?: string; signature_name: string },
  ): Promise<any> => {
    const response = await apiClient.post(`/babysitter-contract/${choiceId}/sign`, data);
    return response.data;
  },

  // Admin: propose 3-5 babysitter candidates to a family (emails the parent a pick link).
  proposeCandidates: async (data: {
    parent_request_id: number;
    choices: Array<{
      babysitter_first_name: string;
      babysitter_last_name?: string;
      babysitter_email?: string;
      babysitter_phone?: string;
      babysitter_address?: string;
      babysitter_pic?: string;
      bb_bs_id?: number | string;
    }>;
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/propose-candidates", data);
    return response.data;
  },

  // Parent: fetch the candidates proposed for a request (reached via emailed link / dashboard).
  getProposedCandidates: async (
    requestId: number,
  ): Promise<{ status: boolean; request?: any; candidates?: any[]; message?: string }> => {
    const response = await apiClient.get(`/match-candidates/${requestId}`);
    return response.data;
  },

  // Parent: submit which proposed candidates they want, with optional interview scheduling.
  selectCandidates: async (data: {
    parent_request_id: number;
    selections: Array<{
      choice_order: number;
      interview_date?: string | null;
      interview_time?: string | null;
    }>;
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/select-candidates", data);
    return response.data;
  },

  // Fetch an Agora RTC token for a video-interview room (public, no auth).
  // `account` is the participant's name, used as their string uid so the other
  // side sees who joined.
  getAgoraToken: async (
    channel: string,
    account?: string,
  ): Promise<{ status: boolean; appId: string; channel: string; uid: string | number; token: string; message?: string }> => {
    const response = await apiClient.get("/agora/token", { params: { channel, account } });
    return response.data;
  },

  // Admin: schedule / reschedule a chosen candidate's online video interview.
  scheduleInterview: async (
    choiceId: number,
    interview_date: string,
    interview_time: string,
  ): Promise<{ status: boolean; message: string; data?: any }> => {
    const response = await apiClient.post("/schedule-interview", {
      choice_id: choiceId,
      interview_date,
      interview_time,
    });
    return response.data;
  },

  updateBabysitterChoice: async (
    choiceId: number,
    data: BabysitterChoicePayload,
  ): Promise<{ status: boolean; message: string; data?: any }> => {
    const response = await apiClient.put(
      `/parent-babysitter-choices/${choiceId}`,
      data,
    );
    return response.data;
  },

  getParentRequests: async (): Promise<{
    status: boolean;
    data: ParentRequest[];
  }> => {
    const response = await apiClient.get("/parent-requests");
    const data = response.data;
    return {
      status: response.status >= 200 && response.status < 300,
      data: Array.isArray(data) ? data : [],
    };
  },

  acceptPriceQuote: async (
    id: number,
  ): Promise<{ status: boolean; message: string }> => {
    try {
      const response = await apiClient.post(`/accept-price-quote/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Reject contract by contract id
  rejectContract: async (
    contractId: number,
  ): Promise<{ status: boolean; message?: string }> => {
    try {
      const response = await apiClient.post(`/reject-contract/${contractId}`);
      const data = response.data;
      const message = typeof data === 'string' ? data : (data?.message || '');
      return {
        status: response.status >= 200 && response.status < 300,
        message,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error?.response?.data?.message || error?.message || 'Request failed',
      };
    }
  },

  selectFinalChoice: async (
    choiceId: number,
  ): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post(`/select-final-choice/${choiceId}`);
    return response.data;
  },

  // Reject a specific babysitter choice (mark as rejected)
  rejectChoice: async (
    choiceId: number,
  ): Promise<{ status: boolean; message?: string; data?: any }> => {
    try {
      const response = await apiClient.post(`/reject-choice/${choiceId}`);
      return {
        status: response.status >= 200 && response.status < 300,
        message: typeof response.data === 'string' ? response.data : response.data?.message,
        data: response.data,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error?.response?.data?.message || error?.message || 'Request failed',
      };
    }
  },

  removeParentRequest: async (
  id: number
    ): Promise<{ status: boolean; message?: string; data?: any }> => {
      try {
        const response = await apiClient.delete(`/parent-requests/${id}`);

        return {
          status: response.status >= 200 && response.status < 300,
          message:
            typeof response.data === 'string'
              ? response.data
              : response.data?.message,
          data: response.data,
        };
      } catch (error: any) {
        return {
          status: false,
          message:
            error?.response?.data?.message ||
            error?.message ||
            'Request failed',
        };
      }
    },

  getContract: async (choiceId: number): Promise<ContractResponse> => {
    const response = await apiClient.get(`/contract/${choiceId}`);
    return response.data;
  },

  createPaymentIntent: async (amount: number, user_id?: number): Promise<any> => {
    const payload: any = { amount };
    if (user_id) payload.user_id = user_id;
    const response = await apiClient.post("/create-payment-intent", payload);
    return response.data;
  },

  confirmPayment: async (paymentIntentId: string, contractId: number): Promise<any> => {
    const response = await apiClient.post("/confirm-payment", {
      payment_intent_id: paymentIntentId,
      contract_id: contractId,
    });
    return response.data;
  },

  confirmInvoicePayment: async (paymentIntentId: string, invoiceId: number): Promise<any> => {
    const response = await apiClient.post("/confirm-invoice-payment", {
      payment_intent_id: paymentIntentId,
      invoice_id: invoiceId,
    });
    return response.data;
  },

  // Manual (non-card) payment for contract signing: bank transfer or CESU.
  // The user uploads a proof of payment file; the backend records it, marks the
  // contract paid/signed, and returns { status }. Mirrors the main site's
  // POST /payment-proof field names (fileUpload, payment_method, amount) but is
  // keyed by contract_id and authenticated via the Bearer token interceptor.
  submitPaymentProof: async (
    contractId: number,
    paymentMethod: "Bank Transfer" | "CESU",
    amount: number,
    file: File,
  ): Promise<any> => {
    const form = new FormData();
    form.append("contract_id", String(contractId));
    form.append("payment_method", paymentMethod);
    form.append("amount", String(amount));
    form.append("fileUpload", file);
    const response = await apiClient.post("/payment-proof", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  
  setDefaultCard: async (paymentMethodId: string): Promise<any> => {
    const response = await apiClient.post("/set-default-card", {
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  deleteCard: async (paymentMethodId: string): Promise<any> => {
    const response = await apiClient.get(`/delete-card/${paymentMethodId}`);
    return response.data;
  },

  addCard: async (): Promise<any> => {
    const response = await apiClient.post("/add-card");
    return response.data;
  },
  
  getAllInvoices: async (params?: { month?: number; year?: number; user_id?: number }): Promise<{
    status: boolean;
    month: number;
    year: number;
    data: Invoice[];
  }> => {
    const response = await apiClient.get("/all-invoices", {
      params,
    });

    return response.data;
  },

  updateCmg: async (cmg_num: string): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.post("/update-cmg", { cmg_num });
    return response.data;
  },

  // --- User Management APIs ---
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get("/user-management");
    return response.data;
  },

  getUserDetails: async (id: number): Promise<User & { parent_requests: any[] }> => {
    const response = await apiClient.get(`/user-management/${id}`);
    const data = response.data.data || response.data;
    return data;
  },

  updateUser: async (id: number, data: {
    first_name: string;
    last_name: string;
    user_phone: string;
    cmg_num: string;
    user_address: string;
    lat?: string | number;
    lng?: string | number;
  }): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.put(`/user-management/${id}`, data);
    return {
      status: response.data.status !== undefined ? response.data.status : (response.status >= 200 && response.status < 300),
      message: response.data.message || 'Operation successful',
      ...response.data
    };
  },

  deleteUser: async (id: number): Promise<{ status: boolean; message: string }> => {
    const response = await apiClient.delete(`/user-management/${id}`);
    return {
      status: response.data.status !== undefined ? response.data.status : (response.status >= 200 && response.status < 300),
      message: response.data.message || 'Operation successful',
      ...response.data
    };
  },

  getContracts: async (): Promise<Contract[]> => {
    const response = await apiClient.get("/contract");
    return response.data;
  },

  getAttestations: async (): Promise<AttestationsResponse> => {
    const response = await apiClient.get("/attestations");
    return response.data;
  },

  getActiveRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/active-requests");
    return response.data;
  },

  getSignedContractRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/contract-signed-requests");
    return response.data;
  },
  
  getNewRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/new-requests");
    return response.data;
  },

  getCompletedRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/completed-requests");
    return response.data;
  },

  getOngoingRequests: async (): Promise<ParentRequest[]> => {
    const response = await apiClient.get("/ongoing-requests");
    return response.data;
  },

};




