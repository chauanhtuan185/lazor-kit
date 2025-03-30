import { useState } from "react";

// Sigpass
import { 
  createSigpassWallet, 
  transfer,
  claim,
} from "../src/lib/sigpass";

import { Button } from "../src/component/login-button";
import "../src/style.css"; // Import CSS

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setSig] = useState<string | null | undefined>(null);
  const [loadingSig, setLoadingSig] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [transferLoading, ] = useState(false);
  const [recipient, setRecipient] = useState<string>(""); // State để lưu địa chỉ ví người nhận
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null); // State để lưu URL giao dịch
  const [showPopup, setShowPopup] = useState(false); // State để hiển thị popup

  function delay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  async function connectWallet() {
    setLoading(true);
    try {
      const popup = window.open(
        'https://w3s.link/ipfs/bafybeibvvxqef5arqj4uy22zwl3hcyvrthyfrjzoeuzyfcbizjur4yt6by/?action=connect',
        'WalletAction', // Thay đổi tên không có dấu cách
        'width=600,height=400'
      );
      new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'WALLET_CONNECTED') {
            const { credentialId, publickey } = event.data.data;
            console.log("Credential ID:", credentialId);
            console.log("Public Key:", publickey);
            createSigpassWallet(publickey);
            setWallet(credentialId.slice(0, 10));
            localStorage.setItem('CREDENTIAL_ID', credentialId);
            localStorage.setItem('PUBLIC_KEY', publickey);
            window.removeEventListener('message', handleMessage);
            resolve({ credentialId, publickey });
        
          } else if (event.data.type === 'WALLET_DISCONNECTED') {
          } else if (event.data.type === 'WALLET_ERROR') {
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
            if (popup) {
              popup.close();
            }
          }
        };

        window.addEventListener('message', handleMessage);

        const checkPopupClosed = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleMessage);
            reject(new Error('Popup closed unexpectedly'));
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Connection timeout'));
        }, 60000);
      });
      setWallet('1');
    } catch (error) {
      console.error("Error creating wallet:", error);
    } finally {
      setLoading(false);
    }
  }

  async function claimUSDC() {
    try {
      setLoadingSig(true);
      try {
        const txid = await claim();
        if (!txid) {
          throw new Error("Transaction ID is undefined or null");
        }
        console.log("Transaction ID:", txid); // Log to verify
        setSig(txid);
        await delay(2); // Wait 2 seconds
        const url = `https://explorer.solana.com/tx/${txid}?cluster=custom&customUrl=https%3A%2F%2Frpc.lazorkit.xyz`;
        console.log("Explorer URL:", url);
        setExplorerUrl(url);
        setShowPopup(true);
        setClaimSuccess(true);
        setBalance("10");
      } catch (error) {
        console.error("Claim failed:", error);
        setClaimSuccess(false); // Update state to reflect failure
        setLoadingSig(false); // Stop loading
      }
    } catch (error) {
      console.error("Error claiming USDC:", error);
    } finally {
      setLoadingSig(false);
    }
  }

  async function transferUSDC() {
    setLoadingSig(true);
    try {
      const credentialId = localStorage.getItem('CREDENTIAL_ID');
      const storedPublicKey = localStorage.getItem('PUBLIC_KEY');
      if (!credentialId || !storedPublicKey) {
        throw new Error('Please connect wallet first');
      }

      const message = btoa(JSON.stringify({
        action: 'claim',
        amount: '5',
        timestamp: Date.now()
      }));

      const popup = window.open(
        `https://w3s.link/ipfs/bafybeibvvxqef5arqj4uy22zwl3hcyvrthyfrjzoeuzyfcbizjur4yt6by/?action=sign&message=${encodeURIComponent(message)}`,
        'WalletAction',
        'width=600,height=400'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      const signaturePromise = new Promise((_resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'SIGNATURE_CREATED') {
            const { normalized , msg , publickey} = event.data.data;
            console.log("Signature:", normalized);
            console.log("Message:", msg);
            const sig = transfer( msg , normalized, publickey);
            setBalance('10');
            window.removeEventListener('message', handleMessage);
            popup.close();
          } else if (event.data.type === 'SIGNATURE_ERROR') {
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
            popup.close();
          }
        };

        window.addEventListener('message', handleMessage);

        // Kiểm tra nếu popup đóng bất ngờ
        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleMessage);
            reject(new Error('Popup closed unexpectedly'));
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Signature timeout'));
        }, 60000);
      });

      await signaturePromise;

    } catch (error) {
      console.error("Error claiming USDC:", error);
    } finally {
      setLoadingSig(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="notification">
          <p className="notification-title">
            You have received <span className="notification-amount">10 USDC</span> from Kay
          </p>
          {!wallet && (
            <p className="notification-subtitle">
              Connect wallet to claim
            </p>
          )}
        </div>

        {wallet && (
          <div className="wallet-info">
            <p>Your Wallet Address:</p>
            <span className="wallet-address">{`${wallet.slice(0, 6)}...${wallet.slice(-4)}`}</span>
          </div>
        )}

        {claimSuccess && (
          <div className="success-message">
            Successfully claimed 10 USDC!
          </div>
        )}

        {wallet && (
          <div className="balance-info">
            Balance: <span className="balance-amount">{`${balance} USDC`}</span>
          </div>
        )}

        <div className="button-container">
          {!wallet && (
            <Button 
              className={`button connect-button`}
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}

          {wallet && !claimSuccess && (
            <Button 
              className={`button claim-button`}
              onClick={claimUSDC}
              disabled={loadingSig}
            >
              {loadingSig ? "Claiming..." : "Claim"}
            </Button>
          )}

          {claimSuccess && (
            <div className="transfer-container">
              <input
                type="text"
                className="recipient-input"
                placeholder="Enter recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <Button 
                className={`button transfer-button`}
                onClick={transferUSDC}
                disabled={transferLoading}
              >
                {transferLoading ? "Transferring..." : "Transfer"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Popup hiển thị URL giao dịch */}
      {showPopup && explorerUrl && (
        <div className="popup">
          <div className="popup-content">
            <p>Transaction Successful!</p>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View Transaction
            </a>
            <button className="close-popup-button" onClick={() => setShowPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
