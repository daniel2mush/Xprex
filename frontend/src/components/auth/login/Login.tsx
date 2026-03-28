"use client";
import z from "zod";
import style from "./Login.module.scss";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/ui/Input/Input";
import { Button } from "@/ui/Buttons/Buttons";
import { LoginUser } from "@/actions/auth-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function LoginPage() {
  const { setUser } = useUserStore();
  const router = useRouter();
  const loginFormSchema = z.object({
    email: z.email({
      error: "Email is required, please enter your email to login",
    }),
    password: z
      .string({ error: "Password is required to login" })
      .min(4, { error: "Error cannot be less than 4 characters" }),
  });

  type loginTypes = z.infer<typeof loginFormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<loginTypes>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const Login = async (data: loginTypes) => {
    const { message, success, user } = await LoginUser(data);

    if (!success || !user) {
      toast.error(message);
      return;
    }

    toast.success(message);
    setUser(user);

    router.push("/");
  };
  return (
    <div className={style.panel}>
      <div className={style.header}>
        <p className={style.eyebrow}>Sign in with email</p>
        <p className={style.description}>
          Use the account tied to your posts, messages, and saved activity.
        </p>
      </div>

      <form className={style.form} onSubmit={handleSubmit(Login)} noValidate>
        <Input
          label="Email"
          placeholder="Enter your email"
          type="email"
          isError={errors.email ? true : false}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          type="password"
          isError={errors.password ? true : false}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className={style.metaRow}>
          <span>Secure session for your account</span>
          <span>Fast access to feed and settings</span>
        </div>

        <Button
          isLoading={isSubmitting}
          fullWidth={true}
          className={style.btn}
          size="md"
        >
          Log in
        </Button>
      </form>
    </div>
  );
}
