/**
 * Verified Cryptocurrency Organization Wallet Addresses
 * Last Updated: April 29, 2026
 * 
 * Sources for verification:
 * - Etherscan.io labeled accounts
 * - Arkham Intel (arkm.com)
 * - CryptoQuant
 * - Official company announcements
 * - Twitter/social media verification
 * 
 * Format:
 * - Ethereum (ETH): 0x prefixed 40-character hex string
 * - BSC: 0x prefixed 40-character hex string (same format as Ethereum)
 * - Solana: Base58 encoded 44-character string
 */

const WALLET_ADDRESSES = {
  // ==================== VENTURE CAPITAL / FUNDS ====================
  
  a16z_Crypto: {
    name: "a16z Crypto",
    type: "fund",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY: Search a16zcrypto.eth on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "a16z manages multiple addresses across their portfolio. Check official announcements."
  },

  Paradigm: {
    name: "Paradigm",
    type: "fund",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY: Search paradigm.eth
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Research Paradigm's official blog for announced addresses"
  },

  Pantera_Capital: {
    name: "Pantera Capital",
    type: "fund",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Check Pantera Capital's official transparency reports"
  },

  Multicoin_Capital: {
    name: "Multicoin Capital",
    type: "fund",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Search for Multicoin Capital addresses on Arkham Intelligence"
  },

  Three_Arrows_Capital: {
    name: "Three Arrows Capital",
    type: "fund",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY - Note: May have limited activity
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Historic fund, addresses may be archived. Check CryptoQuant labeled wallets"
  },

  Jump_Trading: {
    name: "Jump Trading",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Jump Crypto subsidiary - check official announcements"
  },

  Wintermute: {
    name: "Wintermute",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Active market maker - verify through their official website"
  },

  Alameda_Research: {
    name: "Alameda Research",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY - Status unclear post-FTX
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Company status post-2022 collapse - addresses may be archived"
  },

  // ==================== EXCHANGES ====================

  Binance: {
    name: "Binance",
    type: "exchange",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY: Multiple known Binance addresses exist
      verified: false,
      sources: [],
      note: "Binance operates multiple deposit/withdrawal addresses. Check etherscan.io/accounts/label/binance"
    },
    bsc: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY: Binance BSC addresses
      verified: false,
      sources: [],
      note: "Binance Smart Chain native addresses"
    },
    solana: {
      address: null,
      verified: false,
      sources: [],
      note: "Binance Solana deposit addresses are dynamic"
    }
  },

  Coinbase: {
    name: "Coinbase",
    type: "exchange",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: [],
      note: "Coinbase operates multiple addresses for custody"
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    }
  },

  OKX: {
    name: "OKX",
    type: "exchange",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on BSCscan
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    }
  },

  Bybit: {
    name: "Bybit",
    type: "exchange",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on BSCscan
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    }
  },

  // ==================== TRADING FIRMS / MARKET MAKERS ====================

  DWF_Labs: {
    name: "DWF Labs",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on BSCscan
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "DWF Labs - market maker and liquidity provider"
  },

  GSR: {
    name: "GSR (Genesis Volatility)",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Global market maker and arbitrageur"
  },

  Cumberland: {
    name: "Cumberland (DRW)",
    type: "trading-firm",
    ethereum: {
      address: "0x0000000000000000000000000000000000000000", // VERIFY on Etherscan
      verified: false,
      sources: []
    },
    bsc: {
      address: null,
      verified: false,
      sources: []
    },
    solana: {
      address: null,
      verified: false,
      sources: []
    },
    notes: "Cumberland - Division of DRW Holdings"
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get verified addresses only
 */
function getVerifiedAddresses() {
  const verified = {};
  for (const [key, org] of Object.entries(WALLET_ADDRESSES)) {
    if (org.ethereum.verified || org.bsc.verified || org.solana.verified) {
      verified[key] = org;
    }
  }
  return verified;
}

/**
 * Get all addresses for specific organization
 */
function getOrgAddresses(orgKey) {
  return WALLET_ADDRESSES[orgKey] || null;
}

/**
 * Format for blockchain notifications
 */
function formatForNotifications() {
  const formatted = [];
  for (const [key, org] of Object.entries(WALLET_ADDRESSES)) {
    const addresses = [];
    if (org.ethereum.verified) addresses.push({ chain: "ethereum", address: org.ethereum.address });
    if (org.bsc.verified) addresses.push({ chain: "bsc", address: org.bsc.address });
    if (org.solana.verified) addresses.push({ chain: "solana", address: org.solana.address });
    
    if (addresses.length > 0) {
      formatted.push({
        name: org.name,
        type: org.type,
        addresses
      });
    }
  }
  return formatted;
}

module.exports = {
  WALLET_ADDRESSES,
  getVerifiedAddresses,
  getOrgAddresses,
  formatForNotifications
};
