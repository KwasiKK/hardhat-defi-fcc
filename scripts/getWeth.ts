import { ethers, getNamedAccounts } from "hardhat"

export const AMOUNT = ethers.utils.parseEther("0.03").toString()

export async function getWeth() {
    const { deployer } = await getNamedAccounts()
    // to call a contract, you need the abi and contract address
    // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        deployer
    )

    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`We got ${wethBalance} WETH`)
}
