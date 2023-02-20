import { BigNumber, Contract } from "ethers"
import { ethers, getNamedAccounts } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"
import { ILendingPool } from "../typechain-types"
import { AMOUNT, getWeth } from "./getWeth"

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    // abi, address
    //Lending pool provider address
    const lendingPool = await getLendingPool(deployer)
    console.log("Address", lendingPool.address)

    // Deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing!!!")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("!!!Deposited")

    // Borrow
    let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow}`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow in WEI ${amountDaiToBorrowWei}`)
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)

    await repay(amountDaiToBorrowWei.toString(), daiTokenAddress, lendingPool, deployer)

    await getBorrowUserData(lendingPool, deployer)
}

async function repay(
    amount: string,
    daiAddress: string,
    lendingPool: ILendingPool,
    account: Address
) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("_________repayed__________")
}

async function borrowDai(
    daiAddress: Address,
    lendingPool: Contract,
    amountDaiToBorrowWei: BigNumber,
    account: Address
) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("Borrow function competed")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log("DAI/ETH price is ", price.toString())
    return price
}

async function getBorrowUserData(lendingPool: Contract, account: Address) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log("-------Here is the data:-------")
    console.log({
        totalCollateralETH: totalCollateralETH.toString(),
        totalDebtETH: totalDebtETH.toString(),
        availableBorrowsETH: availableBorrowsETH.toString(),
    })

    return { totalDebtETH, availableBorrowsETH }
}

async function approveErc20(
    erc20Address: string,
    spenderAddress: string,
    amountToSpend: string,
    account: Address
) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!!!")
}

async function getLendingPool(account: Address) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )

    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
