export const honorarRegistryAbi = [
  {
    "type": "function",
    "name": "BPS_TOTAL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_RECIPIENTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "computeWorkId",
    "inputs": [
      {
        "name": "contentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "registrant",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "exists",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getWork",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct HonorarRegistry.Work",
        "components": [
          {
            "name": "contentHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "recipients",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "bps",
            "type": "uint16[]",
            "internalType": "uint16[]"
          },
          {
            "name": "readPrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "quotePrice",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "version",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "uri",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerWork",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "uri",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "recipients",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "bps",
        "type": "uint16[]",
        "internalType": "uint16[]"
      },
      {
        "name": "readPrice",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "quotePrice",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setActive",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateWork",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "uri",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "recipients",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "bps",
        "type": "uint16[]",
        "internalType": "uint16[]"
      },
      {
        "name": "readPrice",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "quotePrice",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "newVersion",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "WorkActiveSet",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "active",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WorkRegistered",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "registrant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uri",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WorkUpdated",
    "inputs": [
      {
        "name": "workId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "version",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BpsMustTotal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "LengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoRecipients",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPrimary",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRecipient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyRecipients",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownWork",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WorkIdMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroPrice",
    "inputs": []
  }
] as const;

export const honorarLedgerAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "registry_",
        "type": "address",
        "internalType": "contract HonorarRegistry"
      },
      {
        "name": "usdc_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "treasury_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "agent_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "agent",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mandates",
    "inputs": [
      {
        "name": "reader",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "maxPerAnswer",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "maxPer24h",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "spentWindow",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "windowStart",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract HonorarRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "revokeMandate",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "roots",
    "inputs": [
      {
        "name": "answerId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rotateAgent",
    "inputs": [
      {
        "name": "newAgent",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMandate",
    "inputs": [
      {
        "name": "maxPerAnswer",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "maxPer24h",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTreasury",
    "inputs": [
      {
        "name": "newTreasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "strike",
    "inputs": [
      {
        "name": "answerId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "reader",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "leaves",
        "type": "tuple[]",
        "internalType": "struct HonorarLedger.Leaf[]",
        "components": [
          {
            "name": "workId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "version",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "spanHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "amount",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      },
      {
        "name": "frontedReadingFees",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "gatewayTransfersHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "struck",
    "inputs": [
      {
        "name": "answerId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "workId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20Minimal"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AgentRotated",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AnswerStruck",
    "inputs": [
      {
        "name": "answerId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "reader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "root",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "total",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "fee",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "frontedReadingFees",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "gatewayTransfersHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MandateRevoked",
    "inputs": [
      {
        "name": "reader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MandateSet",
    "inputs": [
      {
        "name": "reader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "maxPerAnswer",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "maxPer24h",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "QuoteStruck",
    "inputs": [
      {
        "name": "answerId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "workId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "spanHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasurySet",
    "inputs": [
      {
        "name": "treasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyStruck",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadMandate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DuplicateWork",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MandateInactive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoLeaves",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAgent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PerAnswerCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PriceMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RootMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnsortedLeaves",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VersionMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WindowCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WorkInactive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroRoot",
    "inputs": []
  }
] as const;
