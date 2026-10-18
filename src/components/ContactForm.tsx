import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaArrowRight, FaCircleCheck, FaCircleExclamation } from "react-icons/fa6";
import { useSubmitContactMessage } from "../api/hooks/useContact";

// The old Django `contact` view had a bug: it saved `subject = request.POST['email']`
// instead of a real subject field, even though the template never rendered a
// subject input either. The API now expects a genuine `subject` string, so this
// form adds a real Subject field and validates it like the rest.
const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name"),
  email: z.string().trim().min(1, "Please enter your email").email("Please enter a valid email address"),
  subject: z.string().trim().min(1, "Please enter a subject"),
  message: z.string().trim().min(1, "Please enter a message"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const { mutate, isPending, isSuccess, isError, reset: resetMutationState } = useSubmitContactMessage();

  function onSubmit(values: ContactFormValues) {
    resetMutationState();
    mutate(values, { onSuccess: () => reset() });
  }

  const field = (name: keyof ContactFormValues) => ({
    id: `contact-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-error` : undefined,
  });

  return (
    <form className="gc-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {isSuccess && (
        <div className="gc-alert gc-alert-success" role="status">
          <FaCircleCheck /> Thanks — your message has been sent. I'll get back to you soon.
        </div>
      )}
      {isError && (
        <div className="gc-alert gc-alert-error" role="alert">
          <FaCircleExclamation /> Something went wrong sending your message. Please try again.
        </div>
      )}

      <div className="gc-field">
        <label className="gc-label" htmlFor="contact-name">
          Name
        </label>
        <input {...register("name")} {...field("name")} type="text" className="gc-input" placeholder="Your name" autoComplete="name" />
        {errors.name && (
          <p id="contact-name-error" className="gc-field-error">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="gc-field">
        <label className="gc-label" htmlFor="contact-email">
          Email
        </label>
        <input
          {...register("email")}
          {...field("email")}
          type="email"
          className="gc-input"
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.email && (
          <p id="contact-email-error" className="gc-field-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="gc-field gc-field-full">
        <label className="gc-label" htmlFor="contact-subject">
          Subject
        </label>
        <input {...register("subject")} {...field("subject")} type="text" className="gc-input" placeholder="What's it about?" />
        {errors.subject && (
          <p id="contact-subject-error" className="gc-field-error">
            {errors.subject.message}
          </p>
        )}
      </div>

      <div className="gc-field gc-field-full">
        <label className="gc-label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          {...register("message")}
          {...field("message")}
          className="gc-input"
          rows={5}
          placeholder="Your message"
        />
        {errors.message && (
          <p id="contact-message-error" className="gc-field-error">
            {errors.message.message}
          </p>
        )}
      </div>

      <div className="gc-field-full">
        <button className="gc-btn gc-btn-primary" type="submit" disabled={isSubmitting || isPending}>
          {isPending ? "Sending…" : "Send message"} <FaArrowRight />
        </button>
      </div>
    </form>
  );
}
