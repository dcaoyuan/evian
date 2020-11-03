import React, { useState, useRef } from 'react';
import { decryptEpkVcode } from './utils/cryptojs-lib/src/bip38.js'
import { getEthAddress, getXRPAddress } from './utils/cryptojs-lib/src/CryptoAddress'
import { RippleAPI } from 'ripple-lib'
import { ReactComponent as ScanQrcodeIcon } from './image/bit38_decode_scan.svg'
import { ReactComponent as SuccessIcon } from './image/org_correct.svg'
// import { ReactComponent as FailedIcon } from './image/org_error.svg'
import QrReader from 'react-qr-reader'
import WAValidator from 'wallet-address-validator'

import './ClaimSpark.scss'

let inputXRPSequence = ''
let decryptPrivateKey = ''
let decryptPublicKey = ''
export default () => {

  const inputRefs = []
  for (let i = 0; i < 24; i ++) {
    inputRefs.push(useRef());
  }
  const [isShowRealPassphrase, setIsShowRealPassphrase] = useState(true)
  const [passphraseInputCount, setPassphraseInputCount] = useState(Array.from(new Array(20).keys()).map(num => ''))
  const [balletPassphrase, setBalletPassphrase] = useState('')
  const [epk, setEpk] = useState("")
  const [decryptXRPAddress, setDecryptXRPAddress] = useState("")
  const [decryptethAddress, setDecryptethAddress] = useState("")
  const [inputXRPAddress, setInputXRPAddress] = useState("")
  const [inputXRPBalance, setInputXRPBalance] = useState("")
  const [isShowInputXRPInfo, setIsShowInputXRPInfo] = useState(false)
  const [isDisableStep2, setIsDisableStep2] = useState(true)
  const [isDisableStep3, setIsDisableStep3] = useState(true)
  const [isShowNotXRPAddressError, setIsShowNotXRPAddressError] = useState(false)
  const [isShowXRPClaimWarnning, setIsShowXRPClaimWarnning] = useState(false)
  const [isShowInputXRPBalanceNotEnough, setIsShowInputXRPBalanceNotEnough] = useState(false)
  const [isShowDecryptError, setIsShowDecryptError] = useState(false)
  const [isShowDecryptXRPAddressNotMatch, setIsShowDecryptXRPAddressNotMatch] = useState(false)
  const [transactionTx, setTransactionTx] = useState('')
  const [isShowSubmitTxSuccess, setIsShowSubmitTxSuccess] = useState(false)
  const [isShowReadEPKQrcode, setIsShowReadEPKQrcode] = useState(false)
  const [isShowReadXRPAddressQrcode, setIsShowReadXRPAddressQrcode] = useState(false)
  const InputItem = ({ inputIndex, value }) => {
    const onKeyDown = (e) => {
      if (e.keyCode === 8) {
        if (!passphraseInputCount[e.target.dataset.id]) {
          setTimeout(() => {
            if (inputIndex > 0) {
              setPassphraseInputCount(passphraseInputCount.map((item, index) => {
                if ((inputIndex - 1) == index) {
                  return ''
                }
                return item
              }))
              inputRefs[inputIndex - 1].current.focus()
              inputRefs[inputIndex - 1].current.select()
            }
          }, 0);
          return
        }
        setPassphraseInputCount(passphraseInputCount.map((item, index) => {
          if (e.target.dataset.id == index) {
            return ''
          }
          return item
        }))
        setTimeout(() => {
          if (inputIndex > 0) {
            inputRefs[inputIndex].current.focus()
            inputRefs[inputIndex].current.select()
          }
        }, 0);
      }
    }
  
    const onChange = (e) => {
      setPassphraseInputCount(passphraseInputCount.map((item, index) => {
        if (e.target.dataset.id == index) {
          return e.target.value
        }
        return item
      }))
      setTimeout(() => {
        if (inputIndex < 19) {
          inputRefs[inputIndex + 1].current.focus()
          inputRefs[inputIndex + 1].current.select()
        }
  
      }, 0);
    }
    return (
      <input
        data-id={inputIndex}
        className="inputItem"
        value={value}
        onChange={(e) => {onChange(e)}}
        ref={inputRefs[inputIndex]}
        onKeyDown={(e) => {onKeyDown(e)}}
        onFocus={(e) => { inputRefs[inputIndex].current.select() }}
      />
    )
  }
  const formatRealPassphrase = (passphraseInputCount) => {
    const realPassphrase = passphraseInputCount.slice()
    realPassphrase.splice(4, 0, "-")
    realPassphrase.splice(9, 0, "-")
    realPassphrase.splice(14, 0, "-")
    realPassphrase.splice(19, 0, "-")
    return realPassphrase.join('').toUpperCase()
  }
  const getPassphrase = () => {
    if (isShowRealPassphrase) {
      return formatRealPassphrase(passphraseInputCount)
    }
    return balletPassphrase
  }
  const decryptClick = () => {
    setIsShowDecryptError(false)
    setIsShowDecryptXRPAddressNotMatch(false)
    setTimeout(() => {
      try {
        const passphrase = getPassphrase()
        const { publicKeyHex, privateKeyHex, } = decryptEpkVcode(epk, passphrase)
        decryptPrivateKey = privateKeyHex;
        decryptPublicKey = publicKeyHex
        const ethAddress = getEthAddress(publicKeyHex)
        const xrpAddress = getXRPAddress(publicKeyHex)
        setDecryptethAddress(ethAddress)
        setDecryptXRPAddress(xrpAddress)
        if (xrpAddress !== inputXRPAddress) {
          setIsShowDecryptXRPAddressNotMatch(true)
          return
        }
        setIsDisableStep2(true)
        setIsDisableStep3(false)
      } catch (error) {
        setIsShowDecryptError(true)
      }
    }, 0);
  }
  const checkInputXRPAddress = async () => {
    inputXRPSequence = ''
    setIsDisableStep2(true)
    setIsDisableStep3(true)
    setInputXRPBalance("")
    setIsShowInputXRPInfo(false)
    setIsShowNotXRPAddressError(false)
    setIsShowInputXRPBalanceNotEnough(false)
    setIsShowXRPClaimWarnning(false)
    const addressIsValid = WAValidator.validate(inputXRPAddress, "XRP")
    if (!addressIsValid) {
      // not a xrp address
      setIsShowNotXRPAddressError(true)
      return 
    }
    let xrpAddressIsClamin = false
    const xrpApi = new RippleAPI({
      server: "wss://s2.ripple.com/"
    })
    let accountInfo = ""
    await xrpApi.connect();
    try {
      accountInfo = await xrpApi.getAccountInfo(inputXRPAddress)
      console.log("accountInfo", accountInfo)
    } catch (error) {
      console.log(error)
    }
    if (accountInfo) {
      const transactions = await xrpApi.getTransactions(inputXRPAddress, {
        limit: 30,
        types: ["settings"]
      })
      console.log("transactions", transactions)
      setInputXRPBalance(accountInfo.xrpBalance)
      setIsShowInputXRPInfo(true)
      inputXRPSequence = accountInfo.sequence
      const isMachMessageKey = transactions.find(transaction => {
        const { messageKey } = transaction.specification;
        if (messageKey) {
          const ethAddress = messageKey.replace(/^02[0]{24}/g, "0x");
          if (ethAddress) {
            const ethAddressMatch = ethAddress.match(/^0x[a-fA-F0-9]{40}$/g);
            if (
              ethAddressMatch !== null &&
              ethAddressMatch.length === 1
            ) {
              console.log(ethAddressMatch)
              console.log("match")
              xrpAddressIsClamin = true
              setIsShowXRPClaimWarnning(true)
              alert(`This XRP address has been associated with the following Spark token address(${ethAddressMatch[0]}). Please confirm if you want to do it again.`)
              return true
            }
          }
        }
        return false
      })
    } else {
      setIsShowInputXRPInfo(true)
      setIsShowInputXRPBalanceNotEnough(true)
    }

    if (Number(accountInfo.xrpBalance) > 20.1) {
      setIsDisableStep2(false)
    }
  }
  const signTransaction = () => {
    if (!decryptPrivateKey || !decryptPublicKey) {
      return
    }
    const messageKey = `02000000000000000000000000${decryptethAddress.substring(2).toUpperCase()}`
    const rawTx = {
      TransactionType: "AccountSet",
      Account : decryptXRPAddress,
      Fee: "30",
      Sequence: inputXRPSequence,
      MessageKey: messageKey
    }
    const xrpApi = new RippleAPI()
    const signTx = xrpApi.sign(JSON.stringify(rawTx), {
      privateKey: decryptPrivateKey,
      publicKey: decryptPublicKey.toUpperCase()
    })
    setTransactionTx(signTx.signedTransaction)
    setPassphraseInputCount(Array.from(new Array(20).keys()).map(num => ''))
    setBalletPassphrase("")
    setEpk("")
    decryptPrivateKey = ""
    decryptPublicKey = ""
    setIsDisableStep3(true)
  }
  const submitSignedTransaction = async () => {
    setIsShowSubmitTxSuccess(false)
    const xrpApi = new RippleAPI({
      server: "wss://s2.ripple.com/"
    })
    await xrpApi.connect();
    try {
      const result = await xrpApi.submit(transactionTx)
      if (result.engine_result_code === 0) {
        setIsShowSubmitTxSuccess(true)
      } else {
        alert("Invalid transaction, please double-check and try again.")
      }
    } catch (error) {
      alert("Invalid transaction, please double-check and try again.")
    }
  }

  return (
    <div className="claimSpark" >
      <div className="container">
        <div className="claimSpark-header" >
          <h1>Spark Token (Flare Networks) Claim Toolkit</h1>
          <div className="description" >Please note that this toolkit only works for Ballet cryptocurrency wallets</div>
        </div>
        <div className="claimSpark-step1">
          <h2>Step 1. Input XRP address</h2>
          {isShowNotXRPAddressError ? (
            <div className="errorText" >
              This XRP address is invalid. Please double-check and try again.
            </div>
          ) : ""}
          <div className="columns">
            <div className="column is-10">
              <div className="xrpAddressWraper" >
                <input
                  className="input"
                  placeholder="Please enter the XRP address"
                  value={inputXRPAddress}
                  onChange={(e) => setInputXRPAddress(e.target.value)}
                />
                <span className="readQrcodeButton" onClick={() => setIsShowReadXRPAddressQrcode(!isShowReadXRPAddressQrcode)}>
                  {isShowReadXRPAddressQrcode ? (
                    <div className="readQrcodeModal">
                      <QrReader
                        delay={200}
                        // onError={onReadQrcodeError}
                        onScan={(data) => {
                          if (data) {
                            setInputXRPAddress(data)
                            setIsShowReadXRPAddressQrcode(false)
                          }
                        }}
                        style={{ width: "100%" }}
                      />
                    </div>
                  ) : ''}
                  <span className="qrButton" ><ScanQrcodeIcon />Scan</span>
                </span>
              </div>
              {isShowInputXRPInfo ? (
                <div className="columns">
                  <div className="column is-12">
                    <div className="inputXRPInfo" >
                      <div className="inputXRPInfo-first" >
                        <span>XRP balance</span>
                        <div className="balance" >
                          {inputXRPBalance || '--'} XRP
                        </div>
                      </div>
                      {isShowInputXRPBalanceNotEnough ? (
                        <div className="errorText" >The XRP balance is less than 21 XRP so cannot move forward to the next step. Please deposit more to ensure the balance is more than 21 XRP.</div>
                      ) : ""}
                    </div>
                  </div>
                </div>
              ) : ""}
            </div>
            <div className="column is-2">
              <a
                className="button is-warning"
                onClick={() => checkInputXRPAddress()}
              >Check</a>
            </div>
          </div>
        </div>
        <div className="claimSpark-step2">
        {isShowInputXRPInfo ? (
            <div className="connect-wraning">
              <div className="warnning-title" >WARNING</div>
              <div>YOUR DEVICE IS CURRENTLY CONNECTED TO THE INTERNET.</div>
              <div>
                We highly recommend that you do steps 2 and 3 in an <b>offline</b> environment.
              </div>
            </div>
          ) : ""}
          <h2>Step 2. Enter passphrase and encrypted private key</h2>
          <div className={`content ${isDisableStep2 ? "disableContent" : ""}`}>
            <div className="passphrase-title" >A. Enter the wallet passphrase.</div>
            <div>
              {isShowRealPassphrase ?
                  'Remove the tamper-evident scratch-off material to reveal the passphrase.' :
                  'Switch to standard input box for PRO Series wallet'}
            </div>
            <div className="passphrase">
              <div className="passphrase__input">
                {isShowRealPassphrase ? (
                <div className="passphrase__real">
                  {passphraseInputCount.map((item, index) => {
                    return (
                      <>
                        <InputItem
                          key={index}
                          inputIndex={index}
                          value={item}
                        />
                        {!((index + 1) % 4) && (index + 1 < 17) ? (<div className="symbolInput"></div>) : ''}
                      </>
                    )
                  })}
                </div>
                ) : (
                <input
                  className="input"
                  placeholder="Enter the wallet passphrase"
                  value={balletPassphrase}
                  onChange={(e) => setBalletPassphrase(e.target.value)}
                />
                )}
              </div>
              <span
                className="switchbutton"
                onClick={() => setIsShowRealPassphrase(!isShowRealPassphrase)}
                style={{
                  color: '#4A83BF',
                  cursor: 'pointer'
                }}
              >
                {isShowRealPassphrase ?
                  'Switch to standard input box for entering generic BIP38 passphrases.' :
                  'Switch to specific input box for Ballet wallets.'
                }
              </span>
            </div>
            <div className="passphrase-title">
              B. Enter the encrypted private key.
            </div>
            <div className="epkDescription" >
              <div>Peel off the top layer sticker and scan the encrypted private key QR code
                <br/>
                (printed on a yellow background).
              </div>
              <span className="readQrcodeButton" onClick={() => setIsShowReadEPKQrcode(!isShowReadEPKQrcode)}>
                {isShowReadEPKQrcode ? (
                  <div className="readQrcodeModal">
                    <QrReader
                      delay={200}
                      // onError={onReadQrcodeError}
                      onScan={(data) => {
                        if (data) {
                          setEpk(data)
                          setIsShowReadEPKQrcode(false)
                        }
                      }}
                      style={{ width: "100%" }}
                    />
                  </div>
                ) : ''}
                <span className="readQrcodeText" ><ScanQrcodeIcon />Scan</span>
              </span>
            </div>
            {isShowDecryptError ? (
              <div className="errorText" >
                The wallet passphrase or encrypted private key you entered is incorrect. Please double-check and try again.
              </div>
            ) : ""}
            <textarea
              className="textarea"
              value={epk}
              onChange={(e) => setEpk(e.target.value)}
            ></textarea>
            <div className="columns" style={{ marginTop: "20px" }}>
              <div className="column is-10"></div>
              <div className="column is-2">
                <a
                  className="button is-warning"
                  onClick={() => decryptClick()}
                >Next</a>
              </div>
            </div>
          </div>
        </div>
        <div className="claimSpark-step3">
          <h2>Step 3.  Verify XRP and Spark token addresses</h2>
          <div className={`content ${isDisableStep3 ? "disableContent" : ""}`}>
            <div className="input-title" >XRP Address</div>
            {isShowDecryptXRPAddressNotMatch ? (
              <div className="errorText" >
                XRP address does NOT match. Please re-enter XRP address, or enter the corresponding wallet passphrase and encryption private key.
              </div>
            ) : ""}
            <input
              className="input"
              disabled
              value={decryptXRPAddress}
            />
            <div className="input-title" >Spark token Address (same format as ETH address)</div>
            <input
              className="input"
              disabled
              value={decryptethAddress}
            />
            <div className="columns" style={{ marginTop: "20px" }} >
              <div className="column is-7"></div>
              <div className="column is-5" onClick={() => signTransaction()}>
                <a className="button is-warning " >Generate signed TX and clear private key</a>
              </div>
            </div>
          </div>
        </div>
        <div className="claimSpark-step4">
          <h2>Step 4. Connect XRP and Spark token addresses (Broadcast and mapping)</h2>
          <textarea
            className="textarea"
            value={transactionTx}
            onChange={(e) => setTransactionTx(e.target.value)}
          ></textarea>
          <div style={{ marginTop: "14px" }}>Option A: Connect to the Internet and then click “Connect”</div>
          <div>Option B: Copy the above transaction to an online computer and then broadcast with another tool</div>
          <div className="columns" style={{ marginTop: "20px" }}>
            <div className="column is-10"></div>
            <div className="column is-2">
              <a
                className="button is-warning"
                onClick={() => {submitSignedTransaction()}}
              >Connect</a>
            </div>
          </div>
          {isShowSubmitTxSuccess ? (
            <div className="submitSuccess" >
              <SuccessIcon />
              <div>
                The claiming process has been successfully completed.<br/>
                Spark tokens will be deposited to your Spark token address on or around Dec 12, 2020.
              </div>
            </div>
          ) : ""}
        </div>
      </div>
    </div>
  )
}
