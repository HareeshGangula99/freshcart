/// <reference types="vite/client" />

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: any) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (callback?: (notification: any) => void) => void;
  renderButton: (parent: HTMLElement, config: any) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface Google {
  accounts: GoogleAccounts;
}

interface Window {
  google?: Google;
}

