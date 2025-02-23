import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Dialog as MuiDialog,
  DialogActions,
  DialogContentText,
  styled,
  alpha,
} from "@mui/material";
import { useERC20 } from "../hooks/useERC20";
import { useStakingContract } from "../hooks/useStakingContract";
import { formatUnits, parseUnits } from "viem";
import { StakeData, StakingOption } from "../types/staking";
import { STAKING_CONTRACT_ADDRESS } from "../constants";
import { useStakingToken } from "@/hooks/useStakingToken";

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  '& .MuiDialogTitle-root': {
    color: 'white',
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
  },
}));

const StyledCard = styled(Card)(() => ({
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(5px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
}));

const StyledInfoCard = styled(StyledCard)(() => ({
  background: `linear-gradient(135deg, ${alpha('#9C27B0', 0.4)} 0%, ${alpha('#673AB7', 0.4)} 100%)`,
  backdropFilter: 'blur(10px)',
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#9C27B0',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#9C27B0',
  },
  '& input': {
    color: 'white',
  },
}));

const StyledTab = styled(Tab)({
  color: 'rgba(255, 255, 255, 0.7)',
  '&.Mui-selected': {
    color: 'white',
  },
  '&:hover': {
    color: 'white',
    opacity: 1,
  },
});

const StyledButton = styled(Button)(() => ({
  background: 'linear-gradient(45deg, #9C27B0 30%, #673AB7 90%)',
  border: 0,
  borderRadius: '8px',
  boxShadow: '0 3px 5px 2px rgba(156, 39, 176, .3)',
  color: 'white',
  height: 48,
  padding: '0 30px',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(45deg, #7B1FA2 30%, #512DA8 90%)',
    boxShadow: '0 4px 10px 2px rgba(156, 39, 176, .4)',
  },
  '&.Mui-disabled': {
    background: 'rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.3)',
  },
}));

interface StakingDialogProps {
  open: boolean;
  onClose: () => void;
  address: `0x${string}`;
  defaultOption?: StakingOption | null;
}

export const StakingDialog: React.FC<StakingDialogProps> = ({
  open,
  onClose,
  address,
  defaultOption,
}) => {
  const [tab, setTab] = useState(0);
  const [amount, setAmount] = useState("");
  const [selectedOption, setSelectedOption] = useState<
    StakingOption | undefined
  >(defaultOption || undefined);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [stakedAmount, setStakedAmount] = useState("0");

  const {
    name,
    symbol,
    decimals,
    balance,
    allowance,
    approve,
    refetchAllowance,
  } = useERC20(address);

  const {
    stakingData,
    stake,
    unstake,
    unstakeFreeze,
    withdrawFrozen,
    isPending,
  } = useStakingContract();

  const { stakingOptions, freezingBalance, availableFrozen } =
    useStakingToken(address);

  console.log(`freezingBalance ${freezingBalance}`);

  // Calculate total staked amount
  const calculateTotalStakedAmount = (
    data?: StakeData[],
    option?: StakingOption
  ) => {
    if (!data) return "0";
    let total = 0n; // Use BigInt for the calculation

    data.forEach((stake) => {
      if (!option || stake.stakingOptionId === option.stakingOptionId) {
        // Convert stake.amount to BigInt since it's already in Wei
        total += BigInt(stake.amount);
      }
    });

    // Format the number by dividing by 10^decimals
    return formatUnits(total, Number(decimals) || 18);
  };

  useEffect(() => {
    try {
      const formattedAmount = calculateTotalStakedAmount(
        stakingData,
        selectedOption
      );
      console.log("Formatted amount:", formattedAmount);
      setStakedAmount(formattedAmount);
    } catch (error) {
      console.error("Error in staked amount calculation:", error);
      setStakedAmount("0");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakingData, selectedOption, decimals]);

  // Filter options based on tab and stake status
  const filteredOptions = stakingOptions?.filter((option) => {
    if (tab === 0) {
      // For Stake tab, only show active options
      return option.isActive;
    } else {
      // For Unstake tab, show both active and inactive options where user has stake
      const hasStake = stakingData?.some(
        (stake) =>
          stake.stakingOptionId === option.stakingOptionId &&
          Number(stake.amount) > 0
      );
      return option.isActive || hasStake;
    }
  });

  // Calculate the potential reward for stake tab
  const calculatePotentialReward = (option: StakingOption, amount: string) => {
    if (!amount || !option) return 0;
    const apy = Number(option.apy) / 100;
    const duration = Number(option.duration) / 31557600; // Convert seconds to years
    return Number(amount) * (apy / 100) * duration;
  };

  // Check if approval is needed when amount changes
  useEffect(() => {
    if (!amount || tab === 1) {
      setNeedsApproval(false);
      return;
    }
    const amountBn = parseFloat(amount);
    const allowanceBn = parseFloat(allowance);
    setNeedsApproval(amountBn > allowanceBn);
  }, [amount, allowance, tab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setSelectedOption(undefined);
    setAmount("");
  };

  const handleApprove = async () => {
    if (!amount) return;

    try {
      setIsApproving(true);
      await approve(
        STAKING_CONTRACT_ADDRESS,
        parseUnits(amount, Number(decimals) || 18)
      );
      await refetchAllowance();
      setIsApproving(false);
    } catch (error) {
      console.error("Approval error:", error);
      setIsApproving(false);
    }
  };

  const handleFrozenUnstake = async () => {
    if (!selectedOption || !amount) return;
    try {
      await unstakeFreeze(
        address,
        selectedOption.stakingOptionId,
        parseUnits(amount, Number(decimals) || 18)
      );
      onClose();
    } catch (error) {
      console.error("Unstake freeze error:", error);
    }
  };

  const handleStakeAction = async () => {
    if (!selectedOption || !amount) return;

    const userStake = stakingData?.find(
      (s) => s.stakingOptionId === selectedOption.stakingOptionId
    );

    const currentTime = Date.now() / 1000;
    const isLocked =
      userStake &&
      currentTime - Number(userStake.startTime) <
        Number(selectedOption.duration);

    if (tab === 1 && isLocked) {
      setConfirmDialogOpen(true);
      return;
    }

    try {
      if (tab === 0) {
        await stake(
          address,
          selectedOption.stakingOptionId,
          parseUnits(amount, Number(decimals) || 18)
        );
      } else {
        await unstake(
          address,
          selectedOption.stakingOptionId,
          parseUnits(amount, Number(decimals) || 18)
        );
      }
      onClose();
    } catch (error) {
      console.error("Staking error:", error);
    }
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Confirmation Dialog Component
  // const ConfirmationDialog = () => (
  //   <MuiDialog
  //     open={confirmDialogOpen}
  //     onClose={() => setConfirmDialogOpen(false)}
  //   >
  //     <DialogTitle>Confirm Early Unstake</DialogTitle>
  //     <DialogContent>
  //       <DialogContentText>
  //         Your tokens are still locked. Proceeding will initiate frozen
  //         unstaking with penalties. Do you want to proceed?
  //       </DialogContentText>
  //     </DialogContent>
  //     <DialogActions>
  //       <Button onClick={() => setConfirmDialogOpen(false)} color='primary'>
  //         Cancel
  //       </Button>
  //       <Button
  //         onClick={async () => {
  //           await handleFrozenUnstake();
  //           setConfirmDialogOpen(false);
  //         }}
  //         color='warning'
  //       >
  //         Proceed
  //       </Button>
  //     </DialogActions>
  //   </MuiDialog>
  // );

  return (
    <>
      <StyledDialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            {name} Staking
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'rgba(255, 255, 255, 0.2)', 
            mb: 2 
          }}>
            <Tabs 
              value={tab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              TabIndicatorProps={{
                style: { background: '#9C27B0' }
              }}
            >
              <StyledTab label="Stake" />
              <StyledTab label="Unstake" />
              <StyledTab label="Frozen Token" />
            </Tabs>
          </Box>

          <Stack spacing={2}>
            {tab === 2 ? (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                  Frozen Token Details
                </Typography>
                <StyledInfoCard>
                  <CardContent>
                    <Typography variant="body1" gutterBottom sx={{ color: 'white' }}>
                      Unfreezing Tokens: {parseFloat(formatUnits(BigInt(freezingBalance?.toString() || "0"), Number(decimals) || 18)).toLocaleString()} {symbol}
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ color: 'white' }}>
                      Available for Withdrawal: {parseFloat(formatUnits(BigInt(availableFrozen?.toString() || "0"), Number(decimals) || 18)).toLocaleString()} {symbol}
                    </Typography>
                    {Number(availableFrozen || 0n) > 0 && (
                      <StyledButton
                        onClick={() => withdrawFrozen(address)}
                        disabled={isPending}
                        sx={{ mt: 2 }}
                        fullWidth
                      >
                        {isPending ? <CircularProgress size={24} color="inherit" /> : "Withdraw Available Tokens"}
                      </StyledButton>
                    )}
                  </CardContent>
                </StyledInfoCard>
              </Box>
            ) : (
              <>
                <StyledInfoCard>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Total Staked Amount
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white', mt: 1 }}>
                          {parseFloat(stakedAmount).toLocaleString()} {symbol}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Available Balance
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white', mt: 1 }}>
                          {Number(balance).toLocaleString()} {symbol}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </StyledInfoCard>

                <StyledTextField
                  fullWidth
                  type="text"
                  label={`Amount in ${symbol}`}
                  value={amount}
                  onChange={handleAmountChange}
                  variant="outlined"
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: 'white', mb: 2 }}>
                    {tab === 0 ? "Select Staking Option" : "Select Token to Unstake"}
                  </Typography>
                  {filteredOptions?.map((option) => {
                    const userStake = stakingData?.find(
                      (s) => s.stakingOptionId === option.stakingOptionId
                    );
                    const stakedAmount = userStake ? Number(userStake.amount) : 0;
                    const potentialReward = tab === 0 && amount
                      ? calculatePotentialReward(option, amount)
                      : 0;

                    const stakingStartTime = userStake
                      ? new Date(Number(userStake.startTime) * 1000)
                      : null;
                    const currentTime = Date.now() / 1000;
                    const remainingTime = stakingStartTime
                      ? Number(userStake?.startTime) + Number(option.duration) - currentTime
                      : 0;
                    const remainingDays = Math.max(0, Math.ceil(remainingTime / 86400));

                    return (
                      <StyledCard
                        key={option.stakingOptionId}
                        sx={{
                          mb: 1,
                          cursor: "pointer",
                          border: selectedOption?.stakingOptionId === option.stakingOptionId
                            ? `2px solid #9C27B0`
                            : "1px solid rgba(255, 255, 255, 0.2)",
                          "&:hover": {
                            borderColor: "#9C27B0",
                          },
                          opacity: option.isActive ? 1 : 0.8,
                        }}
                        onClick={() => setSelectedOption(option)}
                      >
                        <CardContent>
                          <Box sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}>
                            <Typography variant="body1" sx={{ color: 'white' }}>
                              Duration: {Number(option.duration) / 86400} days
                            </Typography>
                            {!option.isActive && (
                              <Chip
                                label="Inactive"
                                color="warning"
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(237, 108, 2, 0.2)',
                                  color: '#ed6c02'
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="body1" sx={{ color: 'white' }}>
                            APY: {Number(option.apy) / 100}%
                          </Typography>
                          {tab === 0 && amount && (
                            <Typography
                              variant="body2"
                              sx={{ 
                                color: '#66bb6a',
                                mt: 1 
                              }}
                            >
                              Potential Reward: {potentialReward.toFixed(2)} {symbol}
                            </Typography>
                          )}
                          {stakedAmount > 0 && (
                            <Typography
                              variant="body2"
                              sx={{ 
                                color: '#9C27B0',
                                mt: 1 
                              }}
                            >
                              Your stake: {parseFloat(formatUnits(BigInt(stakedAmount), Number(decimals) || 18)).toLocaleString()} {symbol}
                            </Typography>
                          )}
                          {tab === 1 && stakedAmount > 0 && stakingStartTime && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Staked on: {stakingStartTime.toLocaleDateString()}
                              </Typography>
                              {remainingDays > 0 ? (
                                <Typography variant="body2" sx={{ color: '#ed6c02' }}>
                                  Locked for {remainingDays} more days
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: '#66bb6a' }}>
                                  Available for unstaking
                                </Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </StyledCard>
                    );
                  })}
                </Box>

                {tab === 0 && needsApproval ? (
                  <StyledButton
                    fullWidth
                    disabled={!selectedOption || !amount || isApproving}
                    onClick={handleApprove}
                  >
                    {isApproving ? <CircularProgress size={24} color="inherit" /> : `Approve ${symbol}`}
                  </StyledButton>
                ) : (
                  <StyledButton
                    fullWidth
                    disabled={!selectedOption || !amount || isPending}
                    onClick={handleStakeAction}
                  >
                    {isPending ? <CircularProgress size={24} color="inherit" /> : `${tab === 0 ? "Stake" : "Unstake"} ${symbol}`}
                  </StyledButton>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
      </StyledDialog>

      <MuiDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          Confirm Early Unstake
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Your tokens are still locked. Proceeding will initiate frozen unstaking with penalties. Do you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialogOpen(false)}
            sx={{ color: 'white' }}
          >
            Cancel
          </Button>
          <StyledButton
            onClick={async () => {
              await handleFrozenUnstake();
              setConfirmDialogOpen(false);
            }}
            sx={{
              background: 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #d32f2f 30%, #c62828 90%)',
              }
            }}
          >
            Proceed
          </StyledButton>
        </DialogActions>
      </MuiDialog>
    </>
  );
};

export default StakingDialog;