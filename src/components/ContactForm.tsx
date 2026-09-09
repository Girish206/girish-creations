import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
    mutate(values, {
      onSuccess: () => {
        reset();
      },
    });
  }

  return (
    <div className="leave-comments-area">
      <div className="text-center">
        {isSuccess && (
          <p style={{ fontSize: 20 }} className="text-success">
            Your Enquiry Sent Successfully!
          </p>
        )}
        {isError && (
          <p style={{ fontSize: 20 }} className="text-danger">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
      <div className="comments-box">
        <form
          onSubmit={handleSubmit((values) => {
            resetMutationState();
            onSubmit(values);
          })}
          noValidate
        >
          <div className="row gx-3">
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label">Name</label>
                <input
                  {...register("name")}
                  type="text"
                  className="form-control shadow-none"
                  placeholder="Enter your name"
                />
                {errors.name && <p className="text-danger mb-0">{errors.name.message}</p>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label">Email</label>
                <input
                  {...register("email")}
                  type="email"
                  className="form-control shadow-none"
                  placeholder="Enter your email"
                />
                {errors.email && <p className="text-danger mb-0">{errors.email.message}</p>}
              </div>
            </div>
            <div className="col-md-12">
              <div className="mb-4">
                <label className="form-label">Subject</label>
                <input
                  {...register("subject")}
                  type="text"
                  className="form-control shadow-none"
                  placeholder="Subject"
                />
                {errors.subject && <p className="text-danger mb-0">{errors.subject.message}</p>}
              </div>
            </div>
            <div className="col-md-12">
              <div className="mb-4">
                <label className="form-label">Comment</label>
                <textarea
                  {...register("message")}
                  className="form-control shadow-none"
                  rows={4}
                  placeholder="Type details about your inquiry"
                />
                {errors.message && <p className="text-danger mb-0">{errors.message.message}</p>}
              </div>
            </div>
            <div className="col-md-12">
              <button className="submit-btn" type="submit" disabled={isSubmitting || isPending}>
                Send Message
                <svg className="icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.5 11.6665V6.6665H12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17.5 6.6665L10 14.1665L2.5 6.6665" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </form>
        <p className="ajax-response mb-0" />
      </div>
    </div>
  );
}
