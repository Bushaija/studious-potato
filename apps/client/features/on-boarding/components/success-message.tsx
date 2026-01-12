import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import successIcon from "@/public/assets/success.png";
import { RefreshCcw } from "lucide-react";

interface SuccessMessageProps {
  title: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}

const successVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
  exit: { opacity: 0, y: -20 },
};

const SuccessMessage: React.FC<SuccessMessageProps> = ({ title, description, onAction, actionLabel }) => {
  return (
    <motion.section
      className="flex flex-col items-center justify-center h-full text-center"
      variants={successVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Image
        src={successIcon}
        alt="Success Icon"
        width={100}
        height={100}
        className="mb-6"
      />
      <h4 className="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">
        {title}
      </h4>
      <p className="mt-2 text-sm max-w-md text-gray-600 dark:text-neutral-300 md:text-base">
        {description}
      </p>
      <div className="mt-8">
          <Button
            onClick={onAction}
            className="bg-black hover:bg-gray-800 text-white rounded-lg px-6 py-3"
          >
            {actionLabel}
          </Button>
      </div>
    </motion.section>
  );
};

export default SuccessMessage;