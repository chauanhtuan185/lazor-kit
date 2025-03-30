/**
 * SIGPASS
 * 
 */

/**
 * Adopted https://github.com/hazae41/webauthnstorage
 * by Hazae41
 */

import { createSmartWalletTransaction , } from '../service/createSmartWallet';
import { getSmartWalletPdaByCreator } from '../service/getPDA';
import {
  createMint,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { createVerifyAndExecuteTransaction } from '../service/verifyAndExecute';
import { Connection, PublicKey , Keypair } from '@solana/web3.js';

const connection = new Connection('https://rpc.lazorkit.xyz', "confirmed");


function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function createSigpassWallet(pubkey: string) {

  await createSmartWalletTransaction({
      secp256k1PubkeyBytes: Array.from(Buffer.from(pubkey, "base64")),
      connection: connection,
  });
  await delay(2);
  
  const smartWalletPubkey = await getSmartWalletPdaByCreator(
    connection,
    Array.from(Buffer.from(pubkey, "base64"))
  );
  console.log(smartWalletPubkey)
  return smartWalletPubkey;

}



async function transfer(msg: string, normalized: string , publickey: string): Promise<string> {

  const payer =  Keypair.fromSecretKey(new Uint8Array([91,139,202,42,20,31,61,11,170,237,184,147,253,10,63,240,131,46,231,211,253,181,58,104,242,192,0,143,19,252,47,158,219,165,97,103,220,26,173,243,207,52,18,44,64,84,249,104,158,221,84,61,36,240,55,20,76,59,142,34,100,132,243,236]))
  const smartWalletPubkey = await getSmartWalletPdaByCreator(
    connection,
    Array.from(Buffer.from(publickey, "base64"))
   );
  console.log(smartWalletPubkey)
  const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      6
  );
  // create ata for smart wallet
  const smartWalletAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      new PublicKey(smartWalletPubkey),
      true
   );
   mintTo(
    connection,
    payer,
    mint,
    smartWalletAta.address,
    payer.publicKey,
    10 * 10 ** 6
  );

  // create ata for wallet
  const walletAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    false
  );
  console.log(await connection.getBalance(smartWalletAta.address))
  const transferTokenInstruction = createTransferCheckedInstruction(
    smartWalletAta.address,
    mint,
    walletAta.address,
    new PublicKey(smartWalletPubkey),
    10 * 10 ** 6,
    6
  );

  const txn = await createVerifyAndExecuteTransaction({
    arbitraryInstruction: transferTokenInstruction,
    pubkey: Buffer.from(publickey, "base64"),
    signature: Buffer.from(normalized, "base64"),
    message: Buffer.from(msg, "base64"),
    connection: connection,
    payer: payer.publicKey,
    smartWalletPda: new PublicKey(smartWalletPubkey),
  });
  txn.partialSign(payer)

  try {
    const txid = await connection.sendRawTransaction(txn.serialize(), {
      skipPreflight: true
    });
    console.log('Transaction confirmed:', txid);
    console.log(await connection.getBalance(smartWalletAta.address))
    return txid;
  } catch (error) {
    console.error("Transaction Error:", error);
    return Promise.reject(error);
  }

}

async function checkSigpassWallet() {

  /**
   * Retrieve the handle to the private key from some unauthenticated storage
   */
  const status: string | null = localStorage.getItem("WALLET_STATUS");

  if (status) {
    return true;
  } else {
    return false;
  }
}

function checkBrowserWebAuthnSupport(): boolean {

  if (navigator.credentials) {
    return true;
  } else {
    return false;
  }
}

export { transfer , checkBrowserWebAuthnSupport, createSigpassWallet , checkSigpassWallet };