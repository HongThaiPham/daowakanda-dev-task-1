import algosdk, { makeAssetTransferTxnWithSuggestedParamsFromObject } from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { SMART_CONTRACT_ARC_32 } from "./client";
import { MNEMONIC_KEY } from '../constant.ts'
import { AppClient } from "@algorandfoundation/algokit-utils/types/app-client";
// The app ID to interact with.
const appId = 736014374;

async function loadClient() {
  const client = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: "https://testnet-api.algonode.cloud",
    },
    indexerConfig: {
      server: "https://testnet-idx.algonode.cloud",
    },
  });

  return client;
}


(async () => {
  const client = await loadClient();
  const account = client.account.fromMnemonic(MNEMONIC_KEY);
  console.log("Account address:", account.addr);

  const appClient = new AppClient({
    appId: BigInt(appId),
    appSpec: JSON.stringify(SMART_CONTRACT_ARC_32),
    algorand: client,
  });

  const suggestedParams = await client.client.algod.getTransactionParams().do();

  const atc = new algosdk.AtomicTransactionComposer();

  // find the asset ID in the global state
  const globalState = await appClient.getGlobalState();
  const assetId = globalState.asset.value;
  console.log(assetId);

  const assetOptinTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
    amount: 0,
    from: account.addr,
    to: account.addr,
    suggestedParams,
    assetIndex: Number(assetId),
  });

  atc.addTransaction({
    txn: assetOptinTxn,
    signer: account.signer,
  });

  atc.addMethodCall({
    method: appClient.getABIMethod('claimAsset'),
    suggestedParams: {
      ...suggestedParams,
      fee: 6_000,
    },
    sender: account.addr,
    signer: account.signer,
    appID: appId,
    appForeignAssets: [Number(assetId)],
  });

  const response = await atc.execute(client.client.algod, 4);
  console.log(response);
  // check the response
  const assetBalance = await client.client.algod.accountAssetInformation(account.addr, Number(assetId)).do();

  console.log('Asset balance', assetBalance);
})()