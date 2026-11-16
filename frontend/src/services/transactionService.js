
import { apiRequest } from "./api";

export const getFreelancerIncome = () =>
    apiRequest("/transactions/income");
