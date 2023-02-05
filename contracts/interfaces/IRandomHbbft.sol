// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @dev provides random seeds created by the cooperative consensus algorithm HBBFT.
interface IRandomHbbft {

    function getSeedHistoric(uint256 blockNumber)
        external
        view
        returns (uint256);

    /// @dev returns true if the network operates normally and provides best random numbers.
    function isFullHealth() external view returns (bool);

    /// @dev returns true if the network did operate normally and provides best random numbers at the given block.
    /// @param blockNumber the block number to check.
    function isFullHealthHistoric(uint256 blockNumber)
        external
        view
        returns (bool);
}
