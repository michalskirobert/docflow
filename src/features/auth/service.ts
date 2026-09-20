import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  CaptchaChallenge,
  LoginPayload,
  RegisterResponse,
  SessionUser,
} from "@/types/auth";
import type { RegisterFormValues } from "./schema";

export function useCaptcha() {
  return useQuery({
    queryKey: ["captcha"],
    queryFn: async () =>
      (await api.get<CaptchaChallenge>("/auth/captcha")).data,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) =>
      (await api.post<SessionUser>("/auth/login", payload)).data,
  });
}
export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterFormValues) =>
      (await api.post<RegisterResponse>("/auth/register", payload)).data,
  });
}
