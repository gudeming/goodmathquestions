"use client";

import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}

export function FeatureCard({
  icon,
  title,
  description,
  color,
  delay,
}: FeatureCardProps) {
  return (
    <motion.div
      className="card-fun text-center group"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
    >
      {/* Icon */}
      <motion.div
        className="text-5xl mb-4"
        whileHover={{ scale: 1.3, rotate: 10 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {icon}
      </motion.div>

      {/* Gradient line */}
      <div
        className={`h-1 w-16 mx-auto rounded-full bg-gradient-to-r ${color} mb-4`}
      />

      {/* Title */}
      <h3 className="text-xl font-heading font-bold text-gray-800 mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 font-body leading-relaxed">{description}</p>
    </motion.div>
  );
}
