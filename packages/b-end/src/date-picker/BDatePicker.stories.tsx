import type { Meta, StoryObj } from "@storybook/react";
import { BDatePicker } from "./BDatePicker";

const meta: Meta<typeof BDatePicker> = {
  title: "BEnd/DatePicker/BDatePicker",
  component: BDatePicker,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BDatePicker>;

export const Default: Story = {
  args: {
    onChange: () => {},
  },
};

export const Range: Story = {
  args: {
    type: "range",
    onChange: () => {},
  },
};
