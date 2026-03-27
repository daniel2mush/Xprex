"use client";
import z from "zod";
import style from "./Register.module.scss";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/ui/Input/Input";
import { Button } from "@/ui/Buttons/Buttons";
import { RegisterUser } from "@/actions/auth-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useUserStore();

  const registerFormSchema = z
    .object({
      email: z.email({
        error: "Email is required, please enter your email to login",
      }),
      username: z
        .string({ error: "Username cannot be empty" })
        .min(3, { error: "Username cannot be less than 3 characters" })
        .max(20, { error: "Username cannot be more than 20 characters" }),
      password: z
        .string({ error: "Password is required to login" })
        .min(8, { error: "Error cannot be less than 4 characters" })
        .max(20, { error: "Password cannot be more than 20 characters" }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      error: "Password does not match",
      path: ["confirmPassword"],
    });

  type registerTypes = z.infer<typeof registerFormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isLoading, isSubmitting },
  } = useForm<registerTypes>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
      confirmPassword: "",
    },
  });

  const Register = async (data: registerTypes) => {
    const { success, message, user } = await RegisterUser({
      email: data.email,
      username: data.username,
      password: data.password,
    });

    if (!success || !user) {
      return toast.error(message);
    }
    toast.success(message);
    setUser(user);

    router.push("/");
    return;
  };
  return (
    <div className="container">
      <div className={style.loginContent}>
        <form className={style.form} onSubmit={handleSubmit(Register)}>
          <div>
            <Input
              label="Email"
              placeholder="Enter your email"
              type="email"
              isError={errors.email ? true : false}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Username"
              placeholder="Enter your username"
              type="text"
              isError={errors.username ? true : false}
              error={errors.username?.message}
              {...register("username")}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              isError={errors.password ? true : false}
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm password"
              placeholder="Confirm your password"
              type="password"
              isError={errors.confirmPassword ? true : false}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>
          <Button
            isLoading={isSubmitting}
            fullWidth={true}
            className={style.btn}
            size="sm"
          >
            Register
          </Button>
        </form>
      </div>
    </div>
  );
}
