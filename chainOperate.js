//管理与链上的交互
import Web3 from 'web3';
import BN from 'bn.js';
import primitives from "./primitives.js";
import rsorc from "./rsorc.js";
const {
    RandomEx,
    RandomG1Point,
    commit,
    rsorcKeyGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
    BASE2,
} = rsorc;
const { randomExponent, 
  randomGroupElement, 
  AdaptorPreSig, 
  AdaptorPreVf,
  Adapt,
  ExtractFromSig,
  ecdsaVf,
  ChainKeyGen,
} =primitives;
import seri from "./serialize.js";
const {
  serializeG1Point,
}=seri;
const testACC = "0xCC3d73a0f6d21cB1d897E614cd4D317D4a77EDd2";
const defaultACC = "0xCC3d73a0f6d21cB1d897E614cd4D317D4a77EDd2";
//const Chain1 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));
//getAccount(Chain1);
//deployPCCT(Chain1,testACC);

//Chaintest(Chain1,4);
//测试
async function Chaintest(web3, num){
    let gas = 0;
    const accList = await getAccount(web3);
    //console.log(accList[0]);
    const ContractPCCT = await deployPCCT(web3, accList[0].address);
    const PCCT = ContractPCCT.ctr;
    console.log(ContractPCCT.gas);
    gas+=ContractPCCT.gas;
    const ini= await initialBal(web3, accList, PCCT);
    gas+=ini;
    console.log("gas:",gas);
    //checkBal(web3,accList,ContractPCCT);
    const testCv = commit(BigInt(5), RandomEx());
    const gas2 = await ctx(accList[1].address,accList[2].address,testCv, PCCT);
    console.log("gas:",gas+gas2);
}
//创建web3账户，返回公(pk)私钥(privatKey)和地址(address)， n为参与用户数量
async function getAccount(web3) {
    var result = [];
    const orgAcc = await web3.eth.getAccounts();
    for (var i=0; i<10; i++) {
        const key= ChainKeyGen();
        //console.log(key);
        let sk = key.sk.toString("hex");
        while (sk.length<66) sk = '0x0'+sk.slice(2);
        //console.log(sk);
        var acc = web3.eth.accounts.privateKeyToAccount(sk);
        acc.address = orgAcc[i]
        acc.key = key;
        result.push(acc);
    }
    //console.log(result[0].address);
    return result;
}
//部署所需的合约上链并返回合约实例
async function deployPCCT(web3,acc) {
var gas;
var pcctContract = new web3.eth.Contract([{"inputs":[{"internalType":"address","name":"s_addr","type":"address"},{"internalType":"address","name":"r_addr","type":"address"},{"components":[{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"X","type":"tuple"},{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"Y","type":"tuple"}],"internalType":"struct B12.G1Point","name":"c","type":"tuple"}],"name":"confidentialTX","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getAcc","outputs":[{"components":[{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"X","type":"tuple"},{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"Y","type":"tuple"}],"internalType":"struct B12.G1Point","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"},{"components":[{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"X","type":"tuple"},{"components":[{"internalType":"uint256","name":"a","type":"uint256"},{"internalType":"uint256","name":"b","type":"uint256"}],"internalType":"struct B12.Fp","name":"Y","type":"tuple"}],"internalType":"struct B12.G1Point","name":"c","type":"tuple"}],"name":"setAcc","outputs":[],"stateMutability":"nonpayable","type":"function"}]);
    var pcct = await pcctContract.deploy({
     data: '0x608060405234801561001057600080fd5b50610b1e806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806309d767fe1461004657806348c6a4cc14610062578063caca4a061461007e575b600080fd5b610060600480360381019061005b9190610938565b6100ae565b005b61007c60048036038101906100779190610987565b610384565b005b6100986004803603810190610093919061090f565b610408565b6040516100a59190610a30565b60405180910390f35b6000819050600060405180604001604052806f01ae3a4617c510eac63b05c06ca1493b81526020017f1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c0000000000181525090506101138360200151826104b090919063ffffffff16565b82602001819052506101cd8260f2613a986000808a73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060405180604001604052908160008201604051806040016040529081600082015481526020016001820154815250508152602001600282016040518060400160405290816000820154815260200160018201548152505081525050610568909392919063ffffffff16565b6000808773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008201518160000160008201518160000155602082015181600101555050602082015181600201600082015181600001556020820151816001015550509050506102fe6000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206040518060400160405290816000820160405180604001604052908160008201548152602001600182015481525050815260200160028201604051806040016040529081600082015481526020016001820154815250508152505060f2613a9886610568909392919063ffffffff16565b6000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008201518160000160008201518160000155602082015181600101555050602082015181600201600082015181600001556020820151816001015550509050505050505050565b806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008201518160000160008201518160000155602082015181600101555050602082015181600201600082015181600001556020820151816001015550509050505050565b6104106107ea565b6000808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020604051806040016040529081600082016040518060400160405290816000820154815260200160018201548152505081526020016002820160405180604001604052908160008201548152602001600182015481525050815250509050919050565b6104b8610810565b600060405180604001604052806f01ae3a4617c510eac63b05c06ca1493b81526020017f1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c000000000018152509050600061050d858361077b565b905060008460200151826020015103905060008260200151821115610533576001610536565b60005b60ff16866000015184600001510303905060405180604001604052808281526020018381525094505050505092915050565b6105706107ea565b61057861082a565b8560000151600001518160006008811061058e57fe5b602002018181525050856000015160200151816001600881106105ad57fe5b602002018181525050856020015160000151816002600881106105cc57fe5b602002018181525050856020015160200151816003600881106105eb57fe5b6020020181815250508460000151600001518160046008811061060a57fe5b6020020181815250508460000151602001518160056008811061062957fe5b6020020181815250508460200151600001518160066008811061064857fe5b6020020181815250508460200151602001518160076008811061066757fe5b6020020181815250506000608082610100848888fa905081604052806106f5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260188152602001807f67312061646420707265636f6d70696c65206661696c6564000000000000000081525060200191505060405180910390fd5b8160006008811061070257fe5b6020020151836000015160000181815250508160016008811061072157fe5b6020020151836000015160200181815250508160026008811061074057fe5b6020020151836020015160000181815250508160036008811061075f57fe5b6020020151836020015160200181815250505050949350505050565b610783610810565b6000826020015184602001510190506000846020015182101580156107ac575083602001518210155b6107b75760016107ba565b60005b60ff1684600001518660000151010190506040518060400160405280828152602001838152509250505092915050565b60405180604001604052806107fd610810565b815260200161080a610810565b81525090565b604051806040016040528060008152602001600081525090565b604051806101000160405280600890602082028036833780820191505090505090565b60008135905061085c81610aba565b92915050565b60006040828403121561087457600080fd5b61087e6040610a4b565b9050600061088e848285016108fa565b60008301525060206108a2848285016108fa565b60208301525092915050565b6000608082840312156108c057600080fd5b6108ca6040610a4b565b905060006108da84828501610862565b60008301525060406108ee84828501610862565b60208301525092915050565b60008135905061090981610ad1565b92915050565b60006020828403121561092157600080fd5b600061092f8482850161084d565b91505092915050565b600080600060c0848603121561094d57600080fd5b600061095b8682870161084d565b935050602061096c8682870161084d565b925050604061097d868287016108ae565b9150509250925092565b60008060a0838503121561099a57600080fd5b60006109a88582860161084d565b92505060206109b9858286016108ae565b9150509250929050565b6040820160008201516109d96000850182610a21565b5060208201516109ec6020850182610a21565b50505050565b608082016000820151610a0860008501826109c3565b506020820151610a1b60408501826109c3565b50505050565b610a2a81610aae565b82525050565b6000608082019050610a4560008301846109f2565b92915050565b6000604051905081810181811067ffffffffffffffff82111715610a7257610a71610ab8565b5b8060405250919050565b6000610a8782610a8e565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565bfe5b610ac381610a7c565b8114610ace57600080fd5b50565b610ada81610aae565b8114610ae557600080fd5b5056fea264697066735822122007cc1a2701377246ce996d301c7a5400f7db204b010e9fe8d36630519d580ef164736f6c63430007060033', 
     arguments: []
    }).send({
     from: acc, 
     gas: '4700000'
   }, function (e, contract){
    //console.log(e, contract);
    if (typeof contract.address !== 'undefined') {
         //console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
    }
 }).on('receipt',function(receipt){
            //console.log(receipt.gasUsed);
            gas = receipt.gasUsed;
        });
    console.log("Contract deployed. address:",pcct.options.address);
    //console.log(gas);
//console.log(pcct);
return {
    ctr:pcct,
    gas:gas
};
}
//初始化链上承诺金额 返回gas消耗总量
async function initialBal(web3, accList, contract) {
    let gasused = 0;
    for (let i =0;i<10;i++) {
        const r = RandomEx();
        const inibal = commit(BigInt(1000),r);
        const seriBal = serializeG1Point(inibal);
        //const seriBal = [["0x0000000000000000000000000000000017f1d3a73197d7942695638c4fa9ac0f","0xc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb"],["0x0000000000000000000000000000000008b3f481e3aaa0f1a09e30ed741d8ae4","0xfcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1"]];
       // console.log(seriBal);
        const receipt = await contract.methods.setAcc(accList[i].address, seriBal)
        .send({
            from: accList[i].address,
            gas:300000,
        })
        .on('receipt',function(receipt){
            //console.log(receipt);
        });
        //console.log(receipt.gasUsed);
        gasused+=receipt.gasUsed;
    //     await contract.methods.setAcc(accList[i].address, seriBal)
    //     .estimateGas({gas: 5000000}, function(error, gasAmount){console.log(gasAmount);
    // if(gasAmount == 5000000)
        // console.log('Method ran out of gas');});
        //await contract.methods.getAcc(accList[i].address).call((e,result)=>{console.log(result)});
    }
    return gasused;
}
//查询链上金额
async function checkBal(web3, accList, contract) {
    for (let i = 0;i<10;i++) {
        await contract.methods.getAcc(accList[i].address).call((e,result)=>{console.log(result)});
        //console.log(i);
    }
}
//执行交易 返回gas值
async function ctx(accs, accr, c_v, contract) {
    const seriCv = serializeG1Point(c_v);
    const receipt = await contract.methods.confidentialTX(accs, accr,seriCv)
        .send({
            from: accs,
            gas:1000000,
        })
        .on('receipt',function(receipt){
            //console.log(receipt);
        });
    return receipt.gasUsed;
}
export default {
    deployPCCT,
    getAccount,
    initialBal,
    checkBal,
    ctx
};